
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
  FormDescription, 
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
import type { NewInventoryItemFormValues, Supplier, UnitType } from '@/lib/types';
import { Loader2, DollarSign } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import { CATEGORY_CODES, getCategoryNameByCodePrefix } from '@/lib/category-mapping';
import { useAuth } from '@/contexts/auth-context'; 

const formSchema = NewInventoryItemClientSchema;

const NO_SUPPLIER_OPTION_VALUE = "__#NONE#_SUPPLIER__"; 

const DEFAULT_FORM_VALUES: NewInventoryItemFormValues = {
  categoryCodePrefix: '',
  shelfCodePrefix: '',
  name: '',
  quantity: '1', 
  unitPrice: '0',
  stockMinimo: '0', 
  dailySales: '0', 
  category: '',
  supplier: '',
  unitType: 'countable',
  unitName: 'unidad',
};

interface AddInventoryItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddInventoryItemDialog({ open, onOpenChange }: AddInventoryItemDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth(); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suppliersList, setSuppliersList] = useState<Supplier[]>([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);

  const form = useForm<NewInventoryItemFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  });

  const watchedCategoryCodePrefix = form.watch('categoryCodePrefix');
  const watchedUnitType = form.watch('unitType');

  const resetFormAndState = useCallback(() => {
    form.reset(DEFAULT_FORM_VALUES);
  }, [form]);

  useEffect(() => {
    if (open) {
      resetFormAndState();
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
  }, [open, resetFormAndState, toast]);


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
    if (!user?.id) {
      toast({ title: "Error de autenticación", description: "No se pudo identificar al usuario para la bitácora.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    
    const result = await addNewInventoryItemAction(values, user.id);
    
    if (result.success && result.item) {
      toast({
        title: 'Artículo Nuevo Añadido',
        description: `El artículo "${result.item.name}" (Código: ${result.item.code}) se ha añadido con ${result.item.quantity} ${result.item.unitName}(s).`,
      });
      onOpenChange(false); 
    } else {
      let errorMessage = result.error || "Ocurrió un error desconocido.";
      if (result.fieldErrors) {
        errorMessage = "Por favor, corrige los errores en el formulario.";
      }
      toast({
        title: 'Error al Añadir Artículo',
        description: errorMessage,
        variant: 'destructive',
      });
    }
    setIsSubmitting(false);
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl bg-popover">
        <DialogHeader>
          <DialogTitle>Añadir Nuevo Artículo al Inventario</DialogTitle>
          <DialogDescription>
            Define el producto, su unidad de medida, precio y stock.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-1 space-y-4 overflow-y-auto max-h-[calc(100vh-200px)] custom-scrollbar pr-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} id="add-item-form" className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Artículo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Pintura Acrílica Azul - Galón" {...field} />
                    </FormControl>
                    <FormDescription>
                     Nombre descriptivo del producto. Si tiene varias presentaciones (ej: galón, litro), incluye la presentación en el nombre.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="unitType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Unidad</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="countable">Contable (ej: unidad, pieza, caja)</SelectItem>
                          <SelectItem value="measurable">Medible (ej: metro, kg, litro)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="unitName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de la Unidad de Medida</FormLabel>
                      <FormControl>
                        <Input placeholder={watchedUnitType === 'countable' ? "Ej: unidad, pieza" : "Ej: litro, metro"} {...field} />
                      </FormControl>
                      <FormDescription>
                        Ej: pieza, litro, metro, kg, rollo, galón, par, docena, lámina, etc.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock de Entrada (en {form.getValues('unitName') || 'unidades'})</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="1" {...field} step={watchedUnitType === 'measurable' ? "0.01" : "1"} />
                      </FormControl>
                      <FormDescription>Esta es la cantidad inicial para la 'Nombre de la Unidad de Medida' que definiste arriba. Por ejemplo, si la unidad es 'galón' y aquí ingresas '5', estás añadiendo 5 galones.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unitPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Precio Unitario (por {form.getValues('unitName') || 'unidad'})</FormLabel>
                       <div className="relative">
                         <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                         <FormControl>
                          <Input type="number" placeholder="0.00" {...field} step="0.01" className="pl-8"/>
                        </FormControl>
                       </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="stockMinimo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Existencias Mínimas (en {form.getValues('unitName') || 'unidades'})</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} step="1" />
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
                      <FormLabel>Ventas Diarias Prom. (en {form.getValues('unitName') || 'unidades'})</FormLabel>
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
                name="supplier"
                render={({ field }) => ( 
                  <FormItem>
                    <FormLabel>Proveedor (Opcional)</FormLabel>
                    <Select
                      value={field.value || NO_SUPPLIER_OPTION_VALUE} 
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
        
        <DialogFooter className="mt-auto pt-6 border-t">
           <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                    Cancelar
                </Button>
           </DialogClose>
          <Button type="submit" form="add-item-form" disabled={isSubmitting || isLoadingSuppliers}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Añadir Artículo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
