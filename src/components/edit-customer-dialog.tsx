
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
  DialogClose,
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
import { updateCustomerAction } from '@/lib/actions';
import { CustomerClientSchema } from '@/lib/form-schemas';
import type { Customer, CustomerFormValues } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import React, { useEffect, useTransition } from 'react';
import { useAuth } from '@/contexts/auth-context'; 
import { useTechnicalMode } from '@/contexts/technical-mode-context'; // Import useTechnicalMode

interface EditCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer;
  onCustomerUpdated?: (updatedCustomer: Customer) => void;
}

const formSchema = CustomerClientSchema.omit({ id: true });

export function EditCustomerDialog({ open, onOpenChange, customer, onCustomerUpdated }: EditCustomerDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth(); 
  const { addMongoCommand } = useTechnicalMode(); // Use the hook
  const [isPending, startTransition] = useTransition();

  const form = useForm<Omit<CustomerFormValues, 'id'>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      ruc: customer.ruc || '',
    },
  });

  useEffect(() => {
    if (customer && open) {
      form.reset({
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
        ruc: customer.ruc || '',
      });
    }
  }, [customer, open, form]);

  async function onSubmit(values: Omit<CustomerFormValues, 'id'>) {
    if (!user?.id) {
      toast({ title: "Error de autenticación", description: "No se pudo identificar al usuario para la bitácora.", variant: "destructive" });
      return;
    }

    const updateFields: any = {};
    if (values.name !== customer.name) updateFields.name = values.name;
    if (values.email !== customer.email) updateFields.email = values.email || '';
    if (values.phone !== customer.phone) updateFields.phone = values.phone || '';
    if (values.address !== customer.address) updateFields.address = values.address || '';
    if (values.ruc !== customer.ruc) updateFields.ruc = values.ruc || '';
    
    if (Object.keys(updateFields).length > 0) {
      updateFields.lastUpdated = "CURRENT_TIMESTAMP";
    }

    const simulatedCommand = `db.customers.updateOne(\n  { _id: ObjectId("${customer.id}") },\n  { $set: ${JSON.stringify(updateFields, null, 2)} }\n);`;
    addMongoCommand(simulatedCommand);

    startTransition(async () => {
      const result = await updateCustomerAction(customer.id, values, user.id);
      if (result.success && result.customer) {
        toast({
          title: 'Cliente Actualizado',
          description: `Los datos del cliente "${result.customer.name}" se han actualizado.`,
        });
        onCustomerUpdated?.(result.customer);
        onOpenChange(false);
      } else {
        toast({
          title: 'Error al Actualizar Cliente',
          description: result.error || "Ocurrió un error desconocido.",
          variant: 'destructive',
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-popover">
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
          <DialogDescription>
            Modifica los detalles del cliente.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre Completo del Cliente</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Maria López" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (Opcional)</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Ej: maria.lopez@ejemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: 987654321" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <FormField
              control={form.control}
              name="ruc"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RUC / Cédula (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: 1234567890001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ej: Av. Siempre Viva 123, Ciudad" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isPending}>
                  Cancelar
                </Button>
              </DialogClose>
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

    