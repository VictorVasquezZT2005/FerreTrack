
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
import { addNewSupplierAction } from '@/lib/actions';
import type { SupplierFormValues, Supplier } from '@/lib/types'; // Added Supplier
import { Loader2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { SupplierClientSchema } from '@/lib/form-schemas'; 
import { useAuth } from '@/contexts/auth-context'; 
import { useTechnicalMode } from '@/contexts/technical-mode-context'; // Import useTechnicalMode

const formSchema = SupplierClientSchema.omit({id: true}); 

interface AddSupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSupplierAdded: (newSupplier: Supplier) => void; // Callback prop
}

export function AddSupplierDialog({ open, onOpenChange, onSupplierAdded }: AddSupplierDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth(); 
  const { addMongoCommand } = useTechnicalMode(); // Use the hook
  const [isPending, startTransition] = useTransition();

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      telefono: '',
      email: '',
      contacto: '',
      productos_suministrados_string: '',
    },
  });

  async function onSubmit(values: SupplierFormValues) {
    if (!user?.id) {
      toast({ title: "Error de autenticación", description: "No se pudo identificar al usuario para la bitácora.", variant: "destructive" });
      return;
    }

    const productosArray = values.productos_suministrados_string
        ? values.productos_suministrados_string.split(',').map(p => p.trim()).filter(p => p)
        : [];
    const simulatedCommand = `db.suppliers.insertOne({\n  name: "${values.name}",\n  telefono: "${values.telefono || ''}",\n  email: "${values.email || ''}",\n  contacto: "${values.contacto || ''}",\n  productos_suministrados: ${JSON.stringify(productosArray)},\n  lastUpdated: "CURRENT_TIMESTAMP"\n});`;
    addMongoCommand(simulatedCommand);

    startTransition(async () => {
      const result = await addNewSupplierAction(values, user.id);

      if (result.success && result.supplier) {
        toast({
          title: 'Proveedor Añadido',
          description: `${result.supplier.name} se ha añadido correctamente.`,
        });
        onSupplierAdded(result.supplier); 
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
          title: 'Error al Añadir Proveedor',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen) form.reset(); 
        onOpenChange(isOpen);
      }}>
      <DialogContent className="sm:max-w-[520px] bg-popover">
        <DialogHeader>
          <DialogTitle>Añadir Nuevo Proveedor</DialogTitle>
          <DialogDescription>
            Completa los detalles para añadir un nuevo proveedor.
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
                Añadir Proveedor
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    