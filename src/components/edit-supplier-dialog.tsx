
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { updateSupplierAction } from '@/lib/actions';
import type { Supplier, SupplierFormValues } from '@/lib/types';
import { SupplierClientSchema } from '@/lib/form-schemas';
import { Loader2 } from 'lucide-react';
import React, { useEffect, useTransition } from 'react';
import { useAuth } from '@/contexts/auth-context'; // Added useAuth

const formSchema = SupplierClientSchema.omit({id: true}); 

interface EditSupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier; 
}

export function EditSupplierDialog({ open, onOpenChange, supplier }: EditSupplierDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth(); // Get user for actorUserId
  const [isPending, startTransition] = useTransition();

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: supplier.name,
      telefono: supplier.telefono || '',
      email: supplier.email || '',
      contacto: supplier.contacto || '',
      productos_suministrados_string: supplier.productos_suministrados?.join(', ') || '',
    },
  });

  useEffect(() => {
    if (supplier) {
      form.reset({
        name: supplier.name,
        telefono: supplier.telefono || '',
        email: supplier.email || '',
        contacto: supplier.contacto || '',
        productos_suministrados_string: supplier.productos_suministrados?.join(', ') || '',
      });
    }
  }, [supplier, form, open]);

  async function onSubmit(values: SupplierFormValues) {
    startTransition(async () => {
      if (!user?.id) {
        toast({ title: "Error de autenticación", description: "No se pudo identificar al usuario para la bitácora.", variant: "destructive" });
        return;
      }
      const result = await updateSupplierAction(supplier.id, values, user.id);

      if (result.success && result.supplier) {
        toast({
          title: 'Proveedor Actualizado',
          description: `El proveedor ${result.supplier.name} se ha actualizado correctamente.`,
        });
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
          title: 'Error al Actualizar Proveedor',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] bg-popover">
        <DialogHeader>
          <DialogTitle>Editar Proveedor</DialogTitle>
          <DialogDescription>
            Modifica los detalles del proveedor.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Proveedor</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Proveedor Ferretero S.L." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="telefono"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: 555-123456" {...field} />
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
                      <Input type="email" placeholder="Ej: contacto@proveedor.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="contacto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Persona de Contacto (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Juan Pérez" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="productos_suministrados_string"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Productos Suministrados (Separados por coma)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ej: Martillos, Tornillos, Pintura" {...field} />
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
