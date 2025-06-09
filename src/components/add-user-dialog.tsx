
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
import { addNewUserAction } from '@/lib/actions';
import type { UserFormValues, User } from '@/lib/types'; // Added User
import { UserFormClientSchema } from '@/lib/form-schemas';
import { Loader2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { useAuth } from '@/contexts/auth-context'; 
import { useTechnicalMode } from '@/contexts/technical-mode-context'; // Import useTechnicalMode

const formSchema = UserFormClientSchema;

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserAdded: (newUser: Omit<User, 'password'>) => void; 
}

export function AddUserDialog({ open, onOpenChange, onUserAdded }: AddUserDialogProps) {
  const { toast } = useToast();
  const { user: actorUser } = useAuth(); 
  const { addMongoCommand } = useTechnicalMode(); // Use the hook
  const [isPending, startTransition] = useTransition();

  const form = useForm<UserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: '',
      email: '',
      rol: 'empleado', 
      password: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(values: UserFormValues) {
    if (!actorUser?.id) {
      toast({ title: "Error de autenticación", description: "No se pudo identificar al usuario que realiza la acción.", variant: "destructive" });
      return;
    }

    const simulatedCommand = `db.users.insertOne({\n  nombre: "${values.nombre}",\n  email: "${values.email}",\n  rol: "${values.rol}",\n  password: "HASHED_PASSWORD",\n  lastUpdated: "CURRENT_TIMESTAMP"\n});`;
    addMongoCommand(simulatedCommand);

    startTransition(async () => {
      const result = await addNewUserAction(values, actorUser.id);

      if (result.success && result.user) {
        toast({
          title: 'Usuario Añadido',
          description: `El usuario ${result.user.nombre} se ha añadido correctamente.`,
        });
        onUserAdded(result.user); 
        form.reset();
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
          title: 'Error al Añadir Usuario',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) form.reset({ 
        nombre: '', 
        email: '', 
        rol: 'empleado', 
        password: '', 
        confirmPassword: '' 
      }); 
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-md bg-popover">
        <DialogHeader>
          <DialogTitle>Añadir Nuevo Usuario</DialogTitle>
          <DialogDescription>
            Completa los detalles para añadir un nuevo usuario al sistema. La contraseña es obligatoria.
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
                  <FormLabel>Contraseña</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Mínimo 6 caracteres" {...field} />
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
                  <FormLabel>Confirmar Contraseña</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Repite la contraseña" {...field} />
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
                Añadir Usuario
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    