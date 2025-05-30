
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
import { updateInventoryItemDetailsAction, fetchSuppliersAction } from '@/lib/actions';
import { EditInventoryItemClientSchema } from '@/lib/form-schemas';
import type { EditInventoryItemFormValues, InventoryItem, Supplier } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import React, { useState, useEffect } from 'react';

const formSchema = EditInventoryItemClientSchema;
const NO_SUPPLIER_OPTION_VALUE = "__#NONE#_SUPPLIER__";

interface EditInventoryItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem;
  onItemUpdated: (updatedItem: InventoryItem) => void;
}

export function EditInventoryItemDialog({ open, onOpenChange, item, onItemUpdated }: EditInventoryItemDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suppliersList, setSuppliersList] = useState<Supplier[]>([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);

  const form = useForm<EditInventoryItemFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: item.id,
      name: item.name || '',
      stockMinimo: String(item.stockMinimo || '0'),
      dailySales: String(item.dailySales || '0'),
      category: item.category || '',
      supplier: item.supplier || '',
      unitPrice: item.unitPrice !== undefined ? String(item.unitPrice) : '',
    },
  });

  useEffect(() => {
    if (item && open) {
      form.reset({
        id: item.id,
        name: item.name || '',
        stockMinimo: String(item.stockMinimo || '0'),
        dailySales: String(item.dailySales || '0'),
        category: item.category || '',
        supplier: item.supplier || '',
        unitPrice: item.unitPrice !== undefined ? String(item.unitPrice) : '',
      });

      const loadSuppliers = async () => {
        setIsLoadingSuppliers(true);
        try {
          const fetchedSuppliers = await fetchSuppliersAction();
          setSuppliersList(fetchedSuppliers);
        } catch (error) {
          console.error("Error al cargar proveedores:", error);
          toast({
            title: "Error",
            description: "No se pudieron cargar los proveedores.",
            variant: "destructive",
          });
        }
        setIsLoadingSuppliers(false);
      };
      loadSuppliers();
    }
  }, [item, open, form, toast]);

  async function onSubmit(values: EditInventoryItemFormValues) {
    setIsSubmitting(true);
    // Ensure ID is included, though it's part of 'values' from form.getValues() implicitly
    const result = await updateInventoryItemDetailsAction(item.id, values);
    setIsSubmitting(false);

    if (result.success && result.item) {
      toast({
        title: 'Artículo Actualizado',
        description: `Los detalles del artículo "${result.item.name}" se han actualizado correctamente.`,
      });
      onItemUpdated(result.item); // Callback to update parent state
      onOpenChange(false);
    } else {
      let errorMessage = result.error || "Ocurrió un error desconocido.";
      if (result.fieldErrors) {
        errorMessage = "Por favor, corrige los errores en el formulario.";
        // Optionally set form errors manually if needed
      }
      toast({
        title: 'Error al Actualizar Artículo',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md md:max-w-lg bg-popover">
        <DialogHeader>
          <DialogTitle>Editar Detalles del Artículo</DialogTitle>
          <DialogDescription>
            Modifica la información del artículo. El código y la cantidad se gestionan por separado.
          </DialogDescription>
        </DialogHeader>

        <div className="py-1 space-y-4 overflow-y-auto max-h-[calc(100vh-200px)] custom-scrollbar pr-2">
          <div className="mb-4 p-3 bg-muted/50 rounded-md">
            <p className="text-sm font-medium text-foreground">Código del Artículo (No editable):</p>
            <p className="text-lg font-mono text-primary">{item.code}</p>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} id={`edit-item-form-${item.id}`} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Artículo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Martillo de uña" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="stockMinimo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Existencias Mínimas</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dailySales"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ventas Diarias Prom.</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de Categoría</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Herramientas" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unitPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio Unitario (Opcional)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="supplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proveedor (Opcional)</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(valueFromSelect) => {
                        if (valueFromSelect === NO_SUPPLIER_OPTION_VALUE) {
                          field.onChange('');
                        } else {
                          field.onChange(valueFromSelect);
                        }
                      }}
                      disabled={isLoadingSuppliers}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingSuppliers ? "Cargando proveedores..." : "Selecciona un proveedor"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_SUPPLIER_OPTION_VALUE}>Ninguno</SelectItem>
                        {suppliersList.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.name}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        <DialogFooter className="mt-auto pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" form={`edit-item-form-${item.id}`} disabled={isSubmitting || isLoadingSuppliers}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
