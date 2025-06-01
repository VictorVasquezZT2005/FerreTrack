
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
import type { Customer, InventoryItem, CreateSaleFormValues, PaymentMethod } from '@/lib/types';
import { Loader2, PlusCircle, Trash2, ShoppingCart, UserCircleIcon, Search, CreditCard, Landmark, ShieldAlert, PackageSearch,ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { FormItem } from '@/components/ui/form';
import { SimulatedCardPaymentDialog } from '@/components/simulated-card-payment-dialog';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import PageLoading from '@/app/loading';
import { CreateSaleClientFormSchema, SaleItemClientFormSchema } from '@/lib/form-schemas';

const NO_CUSTOMER_SELECTED_VALUE = "__NO_CUSTOMER__";

export default function CreateSalePage() {
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [isProcessingSale, startTransition] = useTransition();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allInventoryItems, setAllInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [filteredConceptualProductNames, setFilteredConceptualProductNames] = useState<string[]>([]);
  const [selectedConceptualName, setSelectedConceptualName] = useState<string | null>(null);
  const [availablePresentations, setAvailablePresentations] = useState<InventoryItem[]>([]);
  const [selectedPresentationId, setSelectedPresentationId] = useState<string>('');

  const [quantityForSelectedProduct, setQuantityForSelectedProduct] = useState("1");

  const [isCardPaymentDialogOpen, setIsCardPaymentDialogOpen] = useState(false);
  const [pendingSaleData, setPendingSaleData] = useState<CreateSaleFormValues | null>(null);

  const form = useForm<CreateSaleFormValues>({
    resolver: zodResolver(CreateSaleClientFormSchema),
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
    if (!authLoading && user && user.rol === 'inventory_manager') {
      router.push('/');
      return;
    }

    if (!authLoading && user && (user.rol === 'admin' || user.rol === 'empleado')) {
      async function loadInitialData() {
        setIsLoadingData(true);
        try {
          const [fetchedCustomers, fetchedInventory] = await Promise.all([
            fetchCustomersAction(),
            fetchInventoryItemsForSaleAction(),
          ]);
          setCustomers(fetchedCustomers);
          setAllInventoryItems(fetchedInventory as InventoryItem[]);
        } catch (error) {
          console.error("Error al cargar datos iniciales para la venta:", error);
          toast({ title: "Error", description: "No se pudieron cargar los datos necesarios para la venta.", variant: "destructive" });
        }
        setIsLoadingData(false);
      }
      loadInitialData();
    } else if (!authLoading && !user) {
        router.push('/login');
    }
  }, [user, authLoading, router, toast]);

  useEffect(() => {
    if (searchTerm.length > 0) {
      const normalizedSearchTerm = searchTerm.toLowerCase().trim();
      const nameMap = new Map<string, string>(); // Map: normalizedName -> originalName

      allInventoryItems
        .filter(item =>
          item.name.toLowerCase().trim().includes(normalizedSearchTerm) ||
          item.code.toLowerCase().includes(normalizedSearchTerm) // Assuming code doesn't need trim for search
        )
        .forEach(item => {
          const normalizedItemName = item.name.toLowerCase().trim();
          if (!nameMap.has(normalizedItemName)) {
            nameMap.set(normalizedItemName, item.name); // Store the first encountered original casing
          }
        });
      setFilteredConceptualProductNames(Array.from(nameMap.values()));
    } else {
      setFilteredConceptualProductNames([]);
    }
    setSelectedConceptualName(null);
    setAvailablePresentations([]);
    setSelectedPresentationId('');
  }, [searchTerm, allInventoryItems]);

  useEffect(() => {
    if (selectedConceptualName) {
      const normalizedSelectedName = selectedConceptualName.toLowerCase().trim();
      const presentations = allInventoryItems.filter(
        item => item.name.toLowerCase().trim() === normalizedSelectedName
      );
      setAvailablePresentations(presentations);
      if (presentations.length === 1) {
        setSelectedPresentationId(presentations[0].id);
      } else {
        setSelectedPresentationId('');
      }
    } else {
      setAvailablePresentations([]);
      setSelectedPresentationId('');
    }
  }, [selectedConceptualName, allInventoryItems]);


  const handleConceptualNameSelect = (name: string) => {
    setSelectedConceptualName(name);
    setSearchTerm(name); 
    setFilteredConceptualProductNames([]); 
    setQuantityForSelectedProduct("1");
  };

  const getSelectedInventoryItemForForm = (): InventoryItem | null => {
    if (!selectedPresentationId) return null;
    return availablePresentations.find(p => p.id === selectedPresentationId) || null;
  };

  const handleAddProductToForm = () => {
    const currentSelectedItem = getSelectedInventoryItemForForm();
    if (!currentSelectedItem) {
      toast({ title: "Error", description: "Por favor, seleccione un producto y su medida/presentación.", variant: "destructive" });
      return;
    }

    const quantityNum = parseFloat(quantityForSelectedProduct);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      toast({ title: "Error", description: "La cantidad debe ser un número positivo.", variant: "destructive" });
      return;
    }

    if (quantityNum > currentSelectedItem.quantity) {
       toast({ title: "Error", description: `Stock insuficiente para ${selectedConceptualName || currentSelectedItem.name} (${currentSelectedItem.unitName}). Stock disponible: ${currentSelectedItem.quantity} ${currentSelectedItem.unitName}.`, variant: "destructive" });
      return;
    }

    const existingItemIndex = fields.findIndex(field =>
      field.inventoryItemId === currentSelectedItem.id
    );

    if (existingItemIndex !== -1) {
      const existingItem = fields[existingItemIndex];
      const newQuantityToSell = parseFloat(existingItem.quantityToSell) + quantityNum;

      if (newQuantityToSell > currentSelectedItem.quantity) {
        toast({ title: "Error", description: `Stock insuficiente para ${selectedConceptualName || currentSelectedItem.name} (${currentSelectedItem.unitName}) al sumar con lo ya añadido. Stock disponible: ${currentSelectedItem.quantity} ${currentSelectedItem.unitName}.`, variant: "destructive" });
        return;
      }
      update(existingItemIndex, {
        ...existingItem,
        quantityToSell: newQuantityToSell.toString(),
      });
    } else {
       append({
        inventoryItemId: currentSelectedItem.id,
        productCode: currentSelectedItem.code,
        productName: selectedConceptualName || currentSelectedItem.name,
        unitName: currentSelectedItem.unitName,
        unitPrice: currentSelectedItem.unitPrice,
        quantityToSell: quantityNum.toString(),
        availableStock: currentSelectedItem.quantity,
      });
    }

    setSearchTerm('');
    setSelectedConceptualName(null);
    setAvailablePresentations([]);
    setSelectedPresentationId('');
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
    };

    startTransition(async () => {
      const result = await createSaleAction(user.id, saleDataToSubmit);
      if (result.success && result.sale) {
        toast({
          title: 'Venta Creada Exitosamente',
          description: `Venta número ${result.sale.saleNumber} guardada.`,
        });
        form.reset();
        setSearchTerm('');
        setSelectedConceptualName(null);
        setAvailablePresentations([]);
        setSelectedPresentationId('');
        setQuantityForSelectedProduct("1");
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
    } else {
      proceedWithSaleCreation(values);
    }
  }

  const handleCardPaymentSuccess = () => {
    if (pendingSaleData) {
      proceedWithSaleCreation(pendingSaleData);
      setPendingSaleData(null);
    }
  };

  const totalAmount = fields.reduce((sum, item) => {
    const quantity = parseFloat(item.quantityToSell);
    return sum + (isNaN(quantity) ? 0 : quantity * item.unitPrice);
  }, 0);

  const currentSelectedItemForDisplay = getSelectedInventoryItemForForm();


  if (authLoading || isLoadingData) {
    return <PageLoading />;
  }

  if (user?.rol === 'inventory_manager') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Alert variant="destructive" className="max-w-md">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Acceso Denegado</AlertTitle>
          <AlertDescription>
            No tienes permisos para acceder a esta sección.
          </AlertDescription>
        </Alert>
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
                      disabled={isLoadingData || isProcessingSale}
                    >
                      <SelectTrigger id="customerId">
                        <SelectValue placeholder={isLoadingData ? "Cargando clientes..." : "Seleccionar cliente"} />
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
                      disabled={isProcessingSale}
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

            {true && (
            <Card className="bg-muted/30 p-4">
              <CardHeader className="p-2 pb-3">
                <CardTitle className="text-xl flex items-center gap-2">
                  <PackageSearch className="h-6 w-6"/>
                  Añadir Artículos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="productSearch">Buscar Producto por Nombre o Código</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="productSearch"
                      placeholder="Buscar..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                      disabled={isLoadingData || isProcessingSale}
                    />
                  </div>
                </div>

                {searchTerm && filteredConceptualProductNames.length > 0 && !selectedConceptualName && (
                  <div className="max-h-40 overflow-y-auto border rounded-md bg-background shadow-md">
                    {filteredConceptualProductNames.map(name => (
                      <div
                        key={name}
                        className="p-2 hover:bg-accent hover:text-accent-foreground cursor-pointer"
                        onClick={() => handleConceptualNameSelect(name)}
                      >
                        {name}
                      </div>
                    ))}
                  </div>
                )}

                {selectedConceptualName && availablePresentations.length > 1 && (
                  <div className="space-y-1">
                    <Label htmlFor="presentationSelect">Seleccionar Medida/Presentación</Label>
                    <Select
                      value={selectedPresentationId}
                      onValueChange={setSelectedPresentationId}
                      disabled={isProcessingSale}
                    >
                      <SelectTrigger id="presentationSelect">
                        <SelectValue placeholder={"Elige una medida/presentación..."} />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePresentations.map(item => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.unitName} (Stock: {item.quantity}, Precio: ${item.unitPrice.toFixed(2)})
                            {item.code && <span className="text-xs text-muted-foreground ml-2"> - {item.code}</span>}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {selectedConceptualName && availablePresentations.length === 1 && availablePresentations[0].id === selectedPresentationId && (
                     <div className="space-y-1">
                        <Label>Medida/Presentación</Label>
                        <Input 
                            value={`${availablePresentations[0].unitName} (Stock: ${availablePresentations[0].quantity}, Precio: $${availablePresentations[0].unitPrice.toFixed(2)})`} 
                            readOnly 
                            className="bg-muted/50 border-input"
                        />
                    </div>
                )}


                {currentSelectedItemForDisplay && (
                  <div className="p-3 border rounded-md bg-green-50 dark:bg-green-900/30 space-y-2">
                     <p className="font-semibold text-green-700 dark:text-green-300">
                       Producto Seleccionado: {selectedConceptualName || currentSelectedItemForDisplay.name} - {currentSelectedItemForDisplay.unitName}
                     </p>
                     <p className="text-xs text-muted-foreground">
                       Código: {currentSelectedItemForDisplay.code} | Stock Actual: {currentSelectedItemForDisplay.quantity} {currentSelectedItemForDisplay.unitName} | Precio: ${currentSelectedItemForDisplay.unitPrice.toFixed(2)} / {currentSelectedItemForDisplay.unitName}
                     </p>
                  </div>
                )}

                <div className="flex items-end gap-3">
                  <div className="flex-grow space-y-1">
                    <Label htmlFor="quantityForSelectedProduct">Cantidad (en {currentSelectedItemForDisplay?.unitName || 'unidad'})</Label>
                    <Input
                      id="quantityForSelectedProduct"
                      type="number"
                      value={quantityForSelectedProduct}
                      onChange={(e) => setQuantityForSelectedProduct(e.target.value)}
                      min="0.01"
                      step="any"
                      disabled={!currentSelectedItemForDisplay || isProcessingSale}
                      className="w-full"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddProductToForm}
                    disabled={!currentSelectedItemForDisplay || isProcessingSale}
                    variant="outline"
                    className="h-10"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" /> Añadir
                  </Button>
                </div>
              </CardContent>
            </Card>
            )}

            {fields.length > 0 ? (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Artículos en esta Venta</h3>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="w-[100px]">Cód.</TableHead>
                        <TableHead className="w-[120px] text-center">Unidad</TableHead>
                        <TableHead className="w-[100px] text-right">P. Unit.</TableHead>
                        <TableHead className="w-[100px] text-center">Cantidad</TableHead>
                        <TableHead className="w-[100px] text-right">Subtotal</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((field, index) => {
                        const quantityNum = parseFloat(field.quantityToSell);
                        const subtotal = isNaN(quantityNum) ? 0 : quantityNum * field.unitPrice;
                        return (
                          <TableRow key={field.id}>
                            <TableCell>{field.productName}</TableCell>
                            <TableCell className="font-mono text-xs">{field.productCode}</TableCell>
                            <TableCell className="text-center">{field.unitName}</TableCell>
                            <TableCell className="text-right">${field.unitPrice.toFixed(2)}</TableCell>
                            <TableCell className="text-center">
                              <Controller
                                control={form.control}
                                name={`items.${index}.quantityToSell`}
                                render={({ field: qtyField }) => (
                                  <Input
                                    {...qtyField}
                                    type="number"
                                    className="w-20 text-center mx-auto h-8"
                                    min="0.01"
                                    step="any"
                                    onChange={(e) => {
                                        const newQty = parseFloat(e.target.value);
                                        const itemInArray = form.getValues(`items.${index}`);
                                        if (newQty > itemInArray.availableStock) {
                                            toast({ title: "Stock Insuficiente", description: `No puedes vender más de ${itemInArray.availableStock} ${itemInArray.unitName} de ${itemInArray.productName}.`, variant: "destructive"});
                                            qtyField.onChange(itemInArray.availableStock.toString());
                                        } else {
                                            qtyField.onChange(e.target.value);
                                        }
                                    }}
                                    disabled={isProcessingSale}
                                  />
                                )}
                              />
                            </TableCell>
                            <TableCell className="text-right">${subtotal.toFixed(2)}</TableCell>
                            <TableCell>
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
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                {form.formState.errors.items && typeof form.formState.errors.items === 'object' && !Array.isArray(form.formState.errors.items) && (form.formState.errors.items as any).root?.message && (
                    <p className="text-sm font-medium text-destructive">{(form.formState.errors.items as any).root.message}</p>
                )}
                {Array.isArray(form.formState.errors.items) && form.formState.errors.items.map((error, index) => (
                    error && error.quantityToSell && <p key={index} className="text-sm font-medium text-destructive">Error en artículo {index + 1}: {error.quantityToSell.message}</p>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-4">
                <p>No hay artículos en esta venta todavía.</p>
                <p className="text-sm">Utilice la sección de búsqueda de arriba para añadir productos.</p>
              </div>
            )}


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
