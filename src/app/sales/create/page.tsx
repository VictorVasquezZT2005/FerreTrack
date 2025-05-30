
'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { fetchCustomersAction, fetchInventoryItemsForSaleAction, createSaleAction } from '@/lib/actions';
import type { Customer, InventoryItem, CreateSaleFormValues, SaleItemFormValues, PaymentMethod } from '@/lib/types';
import { Loader2, PlusCircle, Trash2, ShoppingCart, UserCircleIcon, Search, CreditCard, Landmark } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { FormItem } from '@/components/ui/form';
import { SimulatedCardPaymentDialog } from '@/components/simulated-card-payment-dialog'; // Import the new dialog

const SaleItemClientSchema = z.object({
  productId: z.string().min(1, "Debe seleccionar un producto."),
  productCode: z.string(),
  productName: z.string(),
  quantity: z.string().refine(val => {
    const num = parseInt(val, 10);
    return !isNaN(num) && num > 0;
  }, "La cantidad debe ser un número positivo."),
  unitPriceAtSale: z.number().min(0),
  availableStock: z.number().min(0),
}).refine(data => parseInt(data.quantity, 10) <= data.availableStock, {
  message: "La cantidad no puede exceder el stock disponible.",
  path: ["quantity"],
});

const CreateSaleClientSchema = z.object({
  customerId: z.string().optional(),
  items: z.array(SaleItemClientSchema).min(1, "Debe añadir al menos un artículo a la venta."),
  paymentMethod: z.enum(['efectivo', 'tarjeta'], { required_error: "Debe seleccionar un método de pago." }),
});

const NO_CUSTOMER_SELECTED_VALUE = "__NO_CUSTOMER__";

export default function CreateSalePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const [isProcessingSale, startTransition] = useTransition(); // Renamed for clarity
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [inventoryItems, setInventoryItems] = useState<Pick<InventoryItem, 'id' | 'name' | 'code' | 'quantity' | 'unitPrice'>[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [isLoadingInventory, setIsLoadingInventory] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductForForm, setSelectedProductForForm] = useState<Pick<InventoryItem, 'id' | 'name' | 'code' | 'quantity' | 'unitPrice'> | null>(null);
  const [quantityForSelectedProduct, setQuantityForSelectedProduct] = useState("1");

  // State for card payment dialog
  const [isCardPaymentDialogOpen, setIsCardPaymentDialogOpen] = useState(false);
  const [pendingSaleData, setPendingSaleData] = useState<CreateSaleFormValues | null>(null);


  const form = useForm<CreateSaleFormValues>({
    resolver: zodResolver(CreateSaleClientSchema),
    defaultValues: {
      customerId: NO_CUSTOMER_SELECTED_VALUE,
      items: [],
      paymentMethod: 'efectivo',
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  useEffect(() => {
    async function loadInitialData() {
      setIsLoadingCustomers(true);
      setIsLoadingInventory(true);
      try {
        const [fetchedCustomers, fetchedInventory] = await Promise.all([
          fetchCustomersAction(),
          fetchInventoryItemsForSaleAction(),
        ]);
        setCustomers(fetchedCustomers);
        setInventoryItems(fetchedInventory);
      } catch (error) {
        console.error("Error al cargar datos iniciales para la venta:", error);
        toast({ title: "Error", description: "No se pudieron cargar los datos necesarios para la venta.", variant: "destructive" });
      }
      setIsLoadingCustomers(false);
      setIsLoadingInventory(false);
    }
    loadInitialData();
  }, [toast]);

  const filteredInventoryItems = inventoryItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddProductToForm = () => {
    if (!selectedProductForForm) {
      toast({ title: "Error", description: "Por favor, seleccione un producto.", variant: "destructive" });
      return;
    }
    const quantityNum = parseInt(quantityForSelectedProduct, 10);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      toast({ title: "Error", description: "La cantidad debe ser un número positivo.", variant: "destructive" });
      return;
    }
    if (quantityNum > selectedProductForForm.quantity) {
       toast({ title: "Error", description: `Stock insuficiente para ${selectedProductForForm.name}. Disponible: ${selectedProductForForm.quantity}`, variant: "destructive" });
      return;
    }

    const existingItemIndex = fields.findIndex(field => field.productId === selectedProductForForm.id);
    if (existingItemIndex !== -1) {
      const existingItem = fields[existingItemIndex];
      const newQuantity = parseInt(existingItem.quantity, 10) + quantityNum;
      if (newQuantity > selectedProductForForm.quantity) {
        toast({ title: "Error", description: `Stock insuficiente para ${selectedProductForForm.name} al sumar con lo ya añadido. Disponible: ${selectedProductForForm.quantity}`, variant: "destructive" });
        return;
      }
      update(existingItemIndex, {
        ...existingItem,
        quantity: newQuantity.toString(),
      });
    } else {
       append({
        productId: selectedProductForForm.id,
        productCode: selectedProductForForm.code,
        productName: selectedProductForForm.name,
        quantity: quantityNum.toString(),
        unitPriceAtSale: selectedProductForForm.unitPrice || 0,
        availableStock: selectedProductForForm.quantity,
      });
    }
    
    setSelectedProductForForm(null);
    setSearchTerm('');
    setQuantityForSelectedProduct("1");
  };

  const proceedWithSaleCreation = (saleData: CreateSaleFormValues) => {
    if (!user) {
      toast({ title: "Error de autenticación", description: "No se pudo identificar al usuario.", variant: "destructive" });
      return;
    }
     const saleDataToSubmit: CreateSaleFormValues = {
      ...saleData,
      customerId: saleData.customerId === NO_CUSTOMER_SELECTED_VALUE ? undefined : saleData.customerId,
      items: saleData.items.map(item => ({
        ...item,
        quantity: item.quantity 
      }))
    };

    startTransition(async () => {
      const result = await createSaleAction(user.id, saleDataToSubmit);
      if (result.success && result.sale) {
        toast({
          title: 'Venta Creada Exitosamente',
          description: `Venta número ${result.sale.saleNumber} guardada.`,
        });
        form.reset();
        router.push(`/sales/${result.sale.id}`);
      } else if (result.stockError) {
        toast({
          title: 'Error de Stock',
          description: result.stockError,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error al Crear Venta',
          description: result.error || "Ocurrió un error desconocido.",
          variant: 'destructive',
        });
      }
    });
  };

  async function onSubmit(values: CreateSaleFormValues) {
    if (values.paymentMethod === 'tarjeta') {
      setPendingSaleData(values);
      setIsCardPaymentDialogOpen(true);
    } else { // Efectivo
      proceedWithSaleCreation(values);
    }
  }

  const handleCardPaymentSuccess = () => {
    if (pendingSaleData) {
      proceedWithSaleCreation(pendingSaleData);
      setPendingSaleData(null); // Clear pending data
    }
  };


  const totalAmount = fields.reduce((sum, item) => {
    const quantity = parseInt(item.quantity, 10);
    return sum + (isNaN(quantity) ? 0 : quantity * item.unitPriceAtSale);
  }, 0);

  if (isLoadingCustomers || isLoadingInventory) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Cargando datos para la venta...</p>
      </div>
    );
  }
  
  return (
    <>
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
      <Card className="max-w-4xl mx-auto shadow-xl">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <ShoppingCart className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl font-bold">Registrar Nueva Venta</CardTitle>
          </div>
          <CardDescription>Complete los detalles para registrar una nueva venta.</CardDescription>
        </CardHeader>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Customer Selection */}
              <div className="space-y-2">
                <Label htmlFor="customerId" className="flex items-center gap-2 text-base">
                  <UserCircleIcon className="h-5 w-5 text-muted-foreground" />
                  Cliente (Opcional)
                </Label>
                <Controller
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || NO_CUSTOMER_SELECTED_VALUE}
                      disabled={isLoadingCustomers}
                    >
                      <SelectTrigger id="customerId">
                        <SelectValue placeholder={isLoadingCustomers ? "Cargando clientes..." : "Seleccionar cliente"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_CUSTOMER_SELECTED_VALUE}>Venta sin cliente específico (Consumidor Final)</SelectItem>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name} ({customer.ruc || 'N/A'})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.customerId && <p className="text-sm font-medium text-destructive">{form.formState.errors.customerId.message}</p>}
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label className="text-base flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  Método de Pago
                </Label>
                <Controller
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <RadioGroup
                      onValueChange={field.onChange as (value: string) => void}
                      defaultValue={field.value}
                      className="flex items-center space-x-4 pt-2"
                    >
                      <FormItem className="flex items-center space-x-2">
                        <RadioGroupItem value="efectivo" id="efectivo" />
                        <Label htmlFor="efectivo" className="font-normal flex items-center gap-1">
                          <Landmark className="h-4 w-4 text-green-600"/> Efectivo
                        </Label>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2">
                        <RadioGroupItem value="tarjeta" id="tarjeta" />
                        <Label htmlFor="tarjeta" className="font-normal flex items-center gap-1">
                          <CreditCard className="h-4 w-4 text-blue-600"/> Tarjeta
                        </Label>
                      </FormItem>
                    </RadioGroup>
                  )}
                />
                {form.formState.errors.paymentMethod && <p className="text-sm font-medium text-destructive pt-1">{form.formState.errors.paymentMethod.message}</p>}
              </div>
            </div>


            {/* Product Selection Section */}
            <Card className="bg-muted/30 p-4">
              <CardHeader className="p-2 pb-3">
                <CardTitle className="text-xl">Añadir Artículos</CardTitle>
              </CardHeader>
              <CardContent className="p-2 space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="productSearch">Buscar Producto</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="productSearch"
                      placeholder="Buscar por nombre o código..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        if (selectedProductForForm && e.target.value === '') setSelectedProductForForm(null);
                      }}
                      className="pl-8"
                      disabled={isLoadingInventory}
                    />
                  </div>
                </div>

                {searchTerm && filteredInventoryItems.length > 0 && !selectedProductForForm && (
                  <div className="max-h-40 overflow-y-auto border rounded-md bg-background">
                    {filteredInventoryItems.map(item => (
                      <div 
                        key={item.id} 
                        className="p-2 hover:bg-accent cursor-pointer"
                        onClick={() => {
                          setSelectedProductForForm(item);
                          setSearchTerm(item.name); 
                        }}
                      >
                        {item.name} ({item.code}) - Stock: {item.quantity} - Precio: ${item.unitPrice?.toFixed(2) || 'N/A'}
                      </div>
                    ))}
                  </div>
                )}
                
                {selectedProductForForm && (
                   <div className="p-3 border rounded-md bg-green-50 dark:bg-green-900/30">
                     <p className="font-semibold text-green-700 dark:text-green-300">Producto Seleccionado: {selectedProductForForm.name}</p>
                     <p className="text-xs text-muted-foreground">Código: {selectedProductForForm.code} | Stock Actual: {selectedProductForForm.quantity} | Precio Unit.: ${selectedProductForForm.unitPrice?.toFixed(2)}</p>
                   </div>
                )}

                <div className="flex items-end gap-3">
                  <div className="flex-grow space-y-1">
                    <Label htmlFor="quantityForSelectedProduct">Cantidad</Label>
                    <Input
                      id="quantityForSelectedProduct"
                      type="number"
                      value={quantityForSelectedProduct}
                      onChange={(e) => setQuantityForSelectedProduct(e.target.value)}
                      min="1"
                      disabled={!selectedProductForForm}
                      className="w-full"
                    />
                  </div>
                  <Button 
                    type="button" 
                    onClick={handleAddProductToForm} 
                    disabled={!selectedProductForForm || isProcessingSale}
                    variant="outline"
                    className="h-10"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" /> Añadir
                  </Button>
                </div>
              </CardContent>
            </Card>


            {/* Sale Items Table */}
            {fields.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Artículos en esta Venta</h3>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-center">Cantidad</TableHead>
                        <TableHead className="text-right">Precio Unit.</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead className="text-center">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((item, index) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            {item.productName} <span className="text-xs text-muted-foreground">({item.productCode})</span>
                          </TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-right">${item.unitPriceAtSale.toFixed(2)}</TableCell>
                          <TableCell className="text-right">${(parseFloat(item.quantity) * item.unitPriceAtSale).toFixed(2)}</TableCell>
                          <TableCell className="text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive/80 h-7 w-7"
                              onClick={() => remove(index)}
                              disabled={isProcessingSale}
                              title="Eliminar artículo"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                 {form.formState.errors.items && !form.formState.errors.items.message && Array.isArray(form.formState.errors.items) && (
                  form.formState.errors.items.map((itemError, index) => (
                    itemError && itemError.quantity && (
                      <p key={`item-err-${index}`} className="text-sm font-medium text-destructive pt-1">
                        Error en Artículo "{fields[index]?.productName}": {itemError.quantity.message}
                      </p>
                    )
                  ))
                )}
                {form.formState.errors.items && form.formState.errors.items.message && (
                     <p className="text-sm font-medium text-destructive pt-1">{form.formState.errors.items.message}</p>
                )}
              </div>
            )}

            {/* Total Amount */}
            <div className="pt-4 text-right">
              <p className="text-2xl font-bold">Total de la Venta: <span className="text-primary">${totalAmount.toFixed(2)}</span></p>
            </div>
          </CardContent>

          <CardFooter className="border-t pt-6 flex justify-end">
            <Button type="submit" size="lg" disabled={isProcessingSale || fields.length === 0}>
              {isProcessingSale && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              Guardar Venta
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
    {isCardPaymentDialogOpen && pendingSaleData && (
        <SimulatedCardPaymentDialog
          open={isCardPaymentDialogOpen}
          onOpenChange={setIsCardPaymentDialogOpen}
          totalAmount={totalAmount}
          onPaymentSuccess={handleCardPaymentSuccess}
        />
      )}
    </>
  );
}
