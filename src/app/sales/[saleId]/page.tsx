
// src/app/sales/[saleId]/page.tsx
import { fetchSaleByIdAction } from '@/lib/actions';
import type { Sale } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PrintInvoiceButton } from '@/components/print-invoice-button';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Building, ReceiptText, CreditCard, Landmark, UserCircle } from 'lucide-react'; 
import { PrintStyles } from '@/components/print-styles'; 

interface SaleDetailPageProps {
  params: {
    saleId: string;
  };
}

export default async function SaleDetailPage({ params }: SaleDetailPageProps) {
  const saleId = params.saleId;
  const sale = await fetchSaleByIdAction(saleId);

  if (!sale) {
    notFound(); 
  }

  const empresaNombre = "FerreTrack S.A.";
  const empresaRUC = "1234567890001";
  const empresaDireccion = "Calle Ficticia 123, Ciudad Ejemplo";
  const empresaTelefono = "+593 99 999 9999";

  const PaymentMethodIcon = sale.paymentMethod === 'tarjeta' ? CreditCard : Landmark;
  const paymentMethodText = sale.paymentMethod === 'tarjeta' ? 'Tarjeta' : 'Efectivo';

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 print-container">
      <Card className="shadow-xl print-card">
        <CardHeader className="bg-muted/30 print-header">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Building className="h-10 w-10 text-primary" />
                <h1 className="text-3xl font-bold text-primary">{empresaNombre}</h1>
              </div>
              <p className="text-sm text-muted-foreground">{empresaDireccion}</p>
              <p className="text-sm text-muted-foreground">RUC: {empresaRUC} | Tel: {empresaTelefono}</p>
            </div>
            <div className="text-left sm:text-right mt-4 sm:mt-0">
              <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                <ReceiptText className="h-7 w-7" /> FACTURA
              </h2>
              <p className="text-lg font-mono text-primary">{sale.saleNumber}</p>
              <p className="text-sm text-muted-foreground">
                Fecha: {format(new Date(sale.date), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="py-6 px-6 print-content">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-lg font-semibold mb-1 text-foreground flex items-center gap-1.5">
                <UserCircle className="h-5 w-5 text-muted-foreground" />
                Cliente:
              </h3>
              {sale.customerName ? (
                <>
                  <p className="text-base">{sale.customerName}</p>
                  {/* Add more customer details if available and needed */}
                </>
              ) : (
                <p className="text-base">Consumidor Final</p>
              )}
            </div>
            <div className="md:text-right">
                <h3 className="text-lg font-semibold mb-1 text-foreground">Vendido por:</h3>
                <p className="text-base">{sale.sellerName || `Usuario ID: ${sale.userId}`}</p>
            </div>
          </div>

          <Separator className="my-4" />
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-1 text-foreground">Método de Pago:</h3>
            <div className="flex items-center gap-2 text-base">
              <PaymentMethodIcon className={`h-5 w-5 ${sale.paymentMethod === 'tarjeta' ? 'text-blue-600' : 'text-green-600'}`} />
              <span>{paymentMethodText}</span>
            </div>
          </div>


          <Separator className="my-6" />

          <h3 className="text-xl font-semibold mb-3 text-foreground">Detalle de la Venta:</h3>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px] text-center">Código</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-center">Cant.</TableHead>
                  <TableHead className="text-right">P. Unit.</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sale.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-xs text-center">{item.productCode}</TableCell>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right">${item.unitPriceAtSale.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${item.subtotal.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-8 flex justify-end">
            <div className="w-full max-w-xs space-y-2">
              <Separator />
              <div className="flex justify-between text-xl font-bold text-primary">
                <span>TOTAL:</span>
                <span>${sale.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="border-t pt-6 pb-6 px-6 flex flex-col sm:flex-row justify-between items-center print-footer">
          <p className="text-xs text-muted-foreground text-center sm:text-left">
            Gracias por su compra. Este documento es una representación de la venta.
          </p>
          <PrintInvoiceButton />
        </CardFooter>
      </Card>
      <PrintStyles /> 
    </div>
  );
}
