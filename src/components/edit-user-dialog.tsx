
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { updateUserAction } from '@/lib/actions';
import type { User, UserFormValues } from '@/lib/types';
import { UserFormClientSchema } from '@/lib/form-schemas';
import { Loader2 } from 'lucide-react';
import React, { useEffect, useTransition } from 'react';
import { useAuth } from '@/contexts/auth-context'; 
import { useTechnicalMode } from '@/contexts/technical-mode-context'; // Import useTechnicalMode

const formSchema = UserFormClientSchema;

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: Omit<User, 'password' | 'lastUpdated'>; 
  onUserUpdated: (updatedUser: Omit<User, 'password'>) => void; 
}

export function EditUserDialog({ open, onOpenChange, user: userToEdit, onUserUpdated }: EditUserDialogProps) {
  const { toast } = useToast();
  const { user: actorUser } = useAuth(); 
  const { addMongoCommand } = useTechnicalMode(); // Use the hook
  const [isPending, startTransition] = useTransition();

  const form = useForm<UserFormValues>({
    resolver: zodResolver(formSchema),
    // Default values set by useEffect
  });

  useEffect(() => {
    if (userToEdit && open) { 
      form.reset({
        id: userToEdit.id,
        nombre: userToEdit.nombre,
        email: userToEdit.email,
        rol: userToEdit.rol,
        password: '',
        confirmPassword: '',
      });
    }
  }, [userToEdit, form, open]); 

  async function onSubmit(values: UserFormValues) {
    if (!values.id) {
      toast({ title: 'Error', description: 'ID de usuario no encontrado.', variant: 'destructive' });
      return;
    }
    if (!actorUser?.id) {
      toast({ title: "Error de autenticación", description: "No se pudo identificar al usuario que realiza la acción.", variant: "destructive" });
      return;
    }

    const dataToSubmit: UserFormValues = { ...values };
    let passwordChanged = false;
    if (!dataToSubmit.password) {
      delete dataToSubmit.password;
      delete dataToSubmit.confirmPassword;
    } else {
      passwordChanged = true;
    }

    const updatePayload: any = {
      nombre: values.nombre,
      email: values.email,
      rol: values.rol,
      lastUpdated: "CURRENT_TIMESTAMP"
    };
    if (passwordChanged) {
      updatePayload.password = "HASHED_PASSWORD";
    }

    const simulatedCommand = `db.users.updateOne(\n  { _id: ObjectId("${values.id}") },\n  { $set: ${JSON.stringify(updatePayload, null, 2)} }\n);`;
    addMongoCommand(simulatedCommand);

    startTransition(async () => {
      const result = await updateUserAction(values.id!, dataToSubmit, actorUser.id);

      if (result.success && result.user) {
        toast({
          title: 'Usuario Actualizado',
          description: `El usuario ${result.user.nombre} se ha actualizado correctamente.`,
        });
        onUserUpdated(result.user); 
        onOpenChange(false);
      } else {
        let errorMessage = result.error || "Ocurrió un error desconocido.";
        if (result.fieldErrors) {
           const fieldErrorMessages = Object.entries(result.fieldErrors)
            .map(([field, errors]) => `${field}: ${errors?.join(', ')}`)
            .join('; ');
          errorMessage = `Falló la validación: ${fieldErrorMessages}`;
        }
        toast({
          title: 'Error al Actualizar Usuario',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-md bg-popover">
        <DialogHeader>
          <DialogTitle>Editar Usuario</DialogTitle>
          <DialogDescription>
            Modifica los detalles del usuario. Deja la contraseña en blanco si no deseas cambiarla.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre Completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Ana López" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Ej: ana.lopez@ferreteria.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="rol"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rol</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un rol" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="empleado">Empleado</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="inventory_manager">Encargado de Inventario</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nueva Contraseña (Opcional)</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Dejar en blanco para no cambiar" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar Nueva Contraseña</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Repite la nueva contraseña" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Cambios
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    