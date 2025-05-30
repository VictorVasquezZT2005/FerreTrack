
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
import { addNewInventoryItemAction, fetchSuppliersAction } from '@/lib/actions';
import { NewInventoryItemClientSchema } from '@/lib/form-schemas';
import type { NewInventoryItemFormValues, Supplier } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { CATEGORY_CODES, getCategoryNameByCodePrefix } from '@/lib/category-mapping';

const formSchema = NewInventoryItemClientSchema;

const NO_SUPPLIER_OPTION_VALUE = "__#NONE#_SUPPLIER__"; 

interface AddInventoryItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddInventoryItemDialog({ open, onOpenChange }: AddInventoryItemDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suppliersList, setSuppliersList] = useState<Supplier[]>([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);

  const form = useForm<NewInventoryItemFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      categoryCodePrefix: '',
      shelfCodePrefix: '',
      name: '',
      quantity: '1',
      stockMinimo: '0',
      dailySales: '0',
      category: '', 
      supplier: '',
      unitPrice: '',
    },
  });

  const watchedCategoryCodePrefix = form.watch('categoryCodePrefix');

  useEffect(() => {
    if (open) {
      // Reset form to default values when dialog opens
      form.reset({
        categoryCodePrefix: '',
        shelfCodePrefix: '',
        name: '',
        quantity: '1',
        stockMinimo: '0',
        dailySales: '0',
        category: '',
        supplier: '',
        unitPrice: '',
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
  }, [open, form, toast]); // form added to dependency array of useEffect for reset

  useEffect(() => {
    if (watchedCategoryCodePrefix) {
      const categoryName = getCategoryNameByCodePrefix(watchedCategoryCodePrefix);
      if (categoryName) {
        form.setValue('category', categoryName, { shouldValidate: true });
      } else {
        form.setValue('category', '', { shouldValidate: true }); 
      }
    } else {
        form.setValue('category', '', { shouldValidate: true });
    }
  }, [watchedCategoryCodePrefix, form]);

  async function onSubmit(values: NewInventoryItemFormValues) {
    setIsSubmitting(true);
    const result = await addNewInventoryItemAction(values);
    setIsSubmitting(false);

    if (result.success && result.item) {
      toast({
        title: 'Artículo Nuevo Añadido',
        description: `El artículo "${result.item.name}" (Código: ${result.item.code}) se ha añadido correctamente con ${result.item.quantity} unidades.`,
      });
      onOpenChange(false); 
    } else {
      let errorMessage = result.error || "Ocurrió un error desconocido.";
      if (result.fieldErrors) {
        errorMessage = "Por favor, corrige los errores en el formulario.";
        // Manually set form errors for specific fields if needed
        if (result.fieldErrors.categoryCodePrefix) {
          form.setError('categoryCodePrefix', { type: 'manual', message: result.fieldErrors.categoryCodePrefix.join(', ') });
        }
        if (result.fieldErrors.shelfCodePrefix) {
          form.setError('shelfCodePrefix', { type: 'manual', message: result.fieldErrors.shelfCodePrefix.join(', ') });
        }
      }
      toast({
        title: 'Error al Añadir Artículo',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) { // Reset form when dialog is closed by any means
        form.reset({
          categoryCodePrefix: '',
          shelfCodePrefix: '',
          name: '',
          quantity: '1',
          stockMinimo: '0',
          dailySales: '0',
          category: '',
          supplier: '',
          unitPrice: '',
        });
      }
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-md md:max-w-lg bg-popover">
        <DialogHeader>
          <DialogTitle>Añadir Nuevo Artículo al Inventario</DialogTitle>
          <DialogDescription>
            Completa los detalles para añadir un nuevo artículo al inventario.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-1 space-y-4 overflow-y-auto max-h-[calc(100vh-200px)] custom-scrollbar pr-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} id="add-item-form" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="categoryCodePrefix"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoría (CC)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona código CC" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(CATEGORY_CODES).map(([code, name]) => (
                            <SelectItem key={code} value={code}>
                              {code} - {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="shelfCodePrefix"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código de Estante (SS)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: 01, A1 (2 car.)" {...field} maxLength={2} />
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
                    <FormLabel>Nombre de Categoría (Auto-rellenado)</FormLabel>
                    <FormControl>
                      <Input placeholder="Se auto-rellena desde Categoría (CC)" {...field} readOnly className="bg-muted/50 border-input"/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cantidad Inicial</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="1" {...field} />
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
          <Button type="submit" form="add-item-form" disabled={isSubmitting || isLoadingSuppliers}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Añadir Artículo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    