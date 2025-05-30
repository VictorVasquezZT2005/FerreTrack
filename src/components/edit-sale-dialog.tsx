
'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Label } from '@/components/ui/label'; // Added this import
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from '@/hooks/use-toast';
import { updateSaleAction, fetchCustomersAction } from '@/lib/actions';
import type { Sale, Customer, EditSaleFormValues, PaymentMethod } from '@/lib/types';
import { EditSaleClientSchema } from '@/lib/form-schemas';
import { Loader2, UserCircleIcon, CreditCard, Landmark } from 'lucide-react';

const NO_CUSTOMER_SELECTED_VALUE = "__NO_CUSTOMER__";

interface EditSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale;
  onSaleUpdated: (updatedSale: Sale) => void;
}

export function EditSaleDialog({ open, onOpenChange, sale, onSaleUpdated }: EditSaleDialogProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);

  const form = useForm<EditSaleFormValues>({
    resolver: zodResolver(EditSaleClientSchema),
    defaultValues: {
      saleId: sale.id,
      customerId: sale.customerId || NO_CUSTOMER_SELECTED_VALUE,
      paymentMethod: sale.paymentMethod || 'efectivo',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        saleId: sale.id,
        customerId: sale.customerId || NO_CUSTOMER_SELECTED_VALUE,
        paymentMethod: sale.paymentMethod || 'efectivo',
      });

      async function loadCustomers() {
        setIsLoadingCustomers(true);
        try {
          const fetchedCustomers = await fetchCustomersAction();
          setCustomers(fetchedCustomers);
        } catch (error) {
          console.error("Error al cargar clientes:", error);
          toast({ title: "Error", description: "No se pudieron cargar los clientes.", variant: "destructive" });
        }
        setIsLoadingCustomers(false);
      }
      loadCustomers();
    }
  }, [open, sale, form, toast]);

  async function onSubmit(values: EditSaleFormValues) {
    startTransition(async () => {
      const result = await updateSaleAction(values);
      if (result.success && result.sale) {
        onSaleUpdated(result.sale);
        toast({
          title: 'Venta Actualizada',
          description: `La venta ${result.sale.saleNumber} ha sido actualizada.`,
        });
        onOpenChange(false);
      } else {
        toast({
          title: 'Error al Actualizar Venta',
          description: result.error || "Ocurrió un error desconocido.",
          variant: 'destructive',
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-popover">
        <DialogHeader>
          <DialogTitle>Editar Venta: {sale.saleNumber}</DialogTitle>
          <DialogDescription>
            Modifica el cliente o el método de pago. Los artículos y el total no se pueden cambiar aquí.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-2">
            {/* Customer Selection */}
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-base">
                    <UserCircleIcon className="h-5 w-5 text-muted-foreground" />
                    Cliente
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || NO_CUSTOMER_SELECTED_VALUE}
                    disabled={isLoadingCustomers || isPending}
                  >
                    <FormControl>
                      <SelectTrigger id="customerId">
                        <SelectValue placeholder={isLoadingCustomers ? "Cargando clientes..." : "Seleccionar cliente"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_CUSTOMER_SELECTED_VALUE}>Venta sin cliente específico (Consumidor Final)</SelectItem>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name} ({customer.ruc || 'N/A'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Payment Method */}
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    Método de Pago
                  </FormLabel>
                  <RadioGroup
                    onValueChange={field.onChange as (value: string) => void}
                    value={field.value}
                    className="flex items-center space-x-4 pt-2"
                    disabled={isPending}
                  >
                    <FormItem className="flex items-center space-x-2">
                      <RadioGroupItem value="efectivo" id="edit-efectivo" />
                      <Label htmlFor="edit-efectivo" className="font-normal flex items-center gap-1">
                        <Landmark className="h-4 w-4 text-green-600"/> Efectivo
                      </Label>
                    </FormItem>
                    <FormItem className="flex items-center space-x-2">
                      <RadioGroupItem value="tarjeta" id="edit-tarjeta" />
                      <Label htmlFor="edit-tarjeta" className="font-normal flex items-center gap-1">
                        <CreditCard className="h-4 w-4 text-blue-600"/> Tarjeta
                      </Label>
                    </FormItem>
                  </RadioGroup>
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
              <Button type="submit" disabled={isPending || isLoadingCustomers}>
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
