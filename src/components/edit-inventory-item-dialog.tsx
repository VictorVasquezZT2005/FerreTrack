
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
import { updateInventoryItemDetailsAction, fetchSuppliersAction } from '@/lib/actions';
import { EditInventoryItemClientSchema } from '@/lib/form-schemas';
import type { EditInventoryItemFormValues, InventoryItem, Supplier, UnitType } from '@/lib/types';
import { Loader2, DollarSign } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context'; 
import { useTechnicalMode } from '@/contexts/technical-mode-context'; // Import useTechnicalMode

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
  const { user } = useAuth(); 
  const { addMongoCommand } = useTechnicalMode(); // Use the hook
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suppliersList, setSuppliersList] = useState<Supplier[]>([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);

  const form = useForm<EditInventoryItemFormValues>({
    resolver: zodResolver(formSchema),
    // Default values will be set by useEffect when item and open are ready
  });
  
  const watchedUnitType = form.watch('unitType');

  const resetFormWithItemData = useCallback(() => {
    if (item) {
      form.reset({
        id: item.id,
        name: item.name || '',
        unitPrice: String(item.unitPrice || '0'),
        stockMinimo: String(item.stockMinimo || '0'),
        dailySales: String(item.dailySales || '0'),
        category: item.category || '',
        supplier: item.supplier || '',
        unitType: item.unitType || 'countable',
        unitName: item.unitName || 'unidad',
      });
    }
  }, [form, item]);


  useEffect(() => {
    if (open && item) {
      resetFormWithItemData();
      const loadSuppliers = async () => {
        setIsLoadingSuppliers(true);
        try {
          const fetchedSuppliers = await fetchSuppliersAction();
          setSuppliersList(fetchedSuppliers);
        } catch (error) {
          console.error("Error al cargar proveedores:", error);
          toast({ title: "Error", description: "No se pudieron cargar los proveedores.", variant: "destructive"});
        }
        setIsLoadingSuppliers(false);
      };
      loadSuppliers();
    }
  }, [item, open, resetFormWithItemData, toast]);

  async function onSubmit(values: EditInventoryItemFormValues) {
    setIsSubmitting(true);
    if (!user?.id) {
      toast({ title: "Error de autenticación", description: "No se pudo identificar al usuario para la bitácora.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    const simulatedCommand = `db.inventoryItems.updateOne(\n  { _id: ObjectId("${item.id}") },\n  { $set: {\n    name: "${values.name}",\n    unitPrice: ${values.unitPrice},\n    stockMinimo: ${values.stockMinimo},\n    dailySales: ${values.dailySales},\n    category: "${values.category || ''}",\n    supplier: "${values.supplier || ''}",\n    unitType: "${values.unitType}",\n    unitName: "${values.unitName}",\n    lastUpdated: "CURRENT_TIMESTAMP"\n  }}\n);`;
    addMongoCommand(simulatedCommand);
    
    const result = await updateInventoryItemDetailsAction(item.id, values, user.id);
    setIsSubmitting(false);

    if (result.success && result.item) {
      toast({
        title: 'Artículo Actualizado',
        description: `Los detalles del artículo "${result.item.name}" se han actualizado correctamente.`,
      });
      onItemUpdated(result.item); 
      onOpenChange(false);
    } else {
      let errorMessage = result.error || "Ocurrió un error desconocido.";
      if (result.fieldErrors) {
        errorMessage = "Por favor, corrige los errores en el formulario.";
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
      <DialogContent className="sm:max-w-lg md:max-w-xl bg-popover">
        <DialogHeader>
          <DialogTitle>Editar Detalles del Artículo</DialogTitle>
          <DialogDescription>
            Modifica la información del artículo. El código y la cantidad en stock se gestionan por separado.
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
                      <Input placeholder="Ej: Pintura Acrílica Azul Galón" {...field} />
                    </FormControl>
                    <FormDescription>
                     Nombre descriptivo del producto, incluyendo tamaño o presentación si aplica.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de Categoría</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Herramientas" {...field} />
                    </FormControl>
                     <FormDescription>Este nombre de categoría es informativo. El código de categoría (CC) no se puede cambiar.</FormDescription>
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
                          <SelectItem value="countable">Contable (ej: unidad, pieza)</SelectItem>
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
                      <FormLabel>Nombre de la Unidad</FormLabel>
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
              </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              </div>
            </form>
          </Form>
        </div>

        <DialogFooter className="mt-auto pt-6 border-t">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancelar
            </Button>
          </DialogClose>
          <Button type="submit" form={`edit-item-form-${item.id}`} disabled={isSubmitting || isLoadingSuppliers}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    