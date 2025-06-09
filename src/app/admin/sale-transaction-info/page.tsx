
'use client';

import React, { Suspense } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import PageLoading from '@/app/loading';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from '@/components/ui/separator';
import { ShieldAlert, Database, CheckCircle2, XCircle, GitCommit, Undo2, ListChecks, ShoppingCart, PackageMinus, FileText, ArrowRight, ShieldCheck } from 'lucide-react';

function SaleTransactionInfoPageClient() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  if (authLoading) {
    return <PageLoading />;
  }

  if (user?.rol !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Alert variant="destructive" className="max-w-md">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Acceso Denegado</AlertTitle>
          <AlertDescription>
            No tienes permisos para acceder a esta sección. Esta página es solo para administradores.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <Card className="shadow-lg">
        <CardHeader className="text-center bg-muted/30">
          <div className="inline-flex items-center justify-center gap-3 mb-2">
            <Database className="h-10 w-10 text-primary" />
            <ShoppingCart className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold text-primary">Proceso de Venta y Transacciones</CardTitle>
          <CardDescription className="text-lg">
            Entendiendo cómo FerreTrack asegura la integridad de los datos durante una venta.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-foreground flex items-center gap-2">
              <ListChecks className="h-6 w-6 text-accent" />
              Pasos Típicos de una Venta
            </h2>
            <p className="text-muted-foreground mb-4">
              Cuando se realiza una venta en FerreTrack, ocurren varias operaciones críticas en secuencia:
            </p>
            <ul className="space-y-3 list-inside">
              <li className="flex items-start gap-3 p-3 bg-card border rounded-md shadow-sm">
                <span className="flex-shrink-0 mt-1"><CheckCircle2 className="h-5 w-5 text-green-500" /></span>
                <div>
                  <h3 className="font-medium text-foreground">1. Verificación de Stock</h3>
                  <p className="text-sm text-muted-foreground">El sistema comprueba si hay suficientes unidades de cada artículo solicitado.</p>
                </div>
              </li>
              <li className="flex items-start gap-3 p-3 bg-card border rounded-md shadow-sm">
                <span className="flex-shrink-0 mt-1"><PackageMinus className="h-5 w-5 text-blue-500" /></span>
                <div>
                  <h3 className="font-medium text-foreground">2. Descuento de Stock del Inventario</h3>
                  <p className="text-sm text-muted-foreground">Si hay stock, se descuentan las cantidades vendidas del inventario.</p>
                </div>
              </li>
              <li className="flex items-start gap-3 p-3 bg-card border rounded-md shadow-sm">
                <span className="flex-shrink-0 mt-1"><FileText className="h-5 w-5 text-purple-500" /></span>
                <div>
                  <h3 className="font-medium text-foreground">3. Registro de la Venta</h3>
                  <p className="text-sm text-muted-foreground">Se crea un nuevo registro de la venta con todos sus detalles (artículos, total, cliente, etc.).</p>
                </div>
              </li>
            </ul>
            <Alert className="mt-4">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Problema Potencial (Sin Transacciones)</AlertTitle>
              <AlertDescription>
                Si alguno de estos pasos falla (ej: error al guardar la venta después de descontar stock), la base de datos podría quedar en un estado inconsistente. Por ejemplo, stock descontado pero sin venta registrada.
              </AlertDescription>
            </Alert>
          </section>

          <Separator className="my-8" />

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-foreground flex items-center gap-2">
              <Database className="h-6 w-6 text-accent" />
              ¿Qué es una Transacción de Base de Datos?
            </h2>
            <p className="text-muted-foreground mb-4">
              Una transacción de base de datos agrupa múltiples operaciones en una única unidad de trabajo "todo o nada". Esto es crucial para mantener la consistencia de los datos.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-card border rounded-md shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <GitCommit className="h-6 w-6 text-green-600" />
                  <h3 className="text-lg font-medium text-foreground">Commit (Confirmación)</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Si todas las operaciones dentro de la transacción tienen éxito, la transacción se "confirma" (commit). Todos los cambios se guardan permanentemente en la base de datos.
                </p>
              </div>
              <div className="p-4 bg-card border rounded-md shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Undo2 className="h-6 w-6 text-red-600" />
                  <h3 className="text-lg font-medium text-foreground">Rollback/Abort (Reversión)</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Si alguna operación dentro de la transacción falla, la transacción se "revierte" (rollback o abort). Todos los cambios intentados se deshacen, y la base de datos vuelve a su estado anterior al inicio de la transacción.
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              La propiedad clave aquí es la <strong className="text-foreground">Atomicidad</strong>: o todas las operaciones se completan exitosamente, o ninguna lo hace.
            </p>
          </section>

          <Separator className="my-8" />

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-foreground flex items-center gap-2">
              <ShoppingCart className="h-6 w-6 text-accent" />
              Proceso de Venta con Transacciones en FerreTrack
            </h2>
            <p className="text-muted-foreground mb-4">
              La función <code>addSale</code> en FerreTrack ahora utiliza transacciones de MongoDB para asegurar la integridad de los datos. Así es como funciona el flujo:
            </p>
            <div className="p-4 border-2 border-primary/50 rounded-lg bg-primary/5 shadow-md">
              <h3 className="text-xl font-semibold mb-3 text-primary flex items-center gap-2">
                <Database className="h-5 w-5" /> Inicio de la Transacción
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-mono text-muted-foreground">1.</span>
                  <PackageMinus className="h-5 w-5 text-blue-600" />
                  <p className="text-foreground">Verificación y descuento de stock para <strong>todos</strong> los artículos.</p>
                </div>
                <div className="flex items-center justify-center my-2">
                    <ArrowRight className="h-5 w-5 text-muted-foreground animate-pulse" />
                </div>
                <div className="flex items-center gap-2">
                 <span className="text-lg font-mono text-muted-foreground">2.</span>
                  <FileText className="h-5 w-5 text-purple-600" />
                  <p className="text-foreground">Creación del registro de la venta.</p>
                </div>
              </div>
              <Separator className="my-4 border-primary/30" />
              <div className="mt-3">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                  <h4 className="text-lg font-medium text-green-700">Si todo es exitoso:</h4>
                </div>
                <p className="text-sm text-muted-foreground ml-8">
                  La transacción se <strong className="text-foreground">confirma (commit)</strong>. El stock se actualiza y la venta se guarda.
                </p>
              </div>
              <div className="mt-3">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="h-6 w-6 text-red-600" />
                  <h4 className="text-lg font-medium text-red-700">Si algo falla (ej: stock insuficiente, error de base de datos):</h4>
                </div>
                <p className="text-sm text-muted-foreground ml-8">
                  La transacción se <strong className="text-foreground">revierte (rollback)</strong>. No se descuenta stock y la venta no se guarda. La base de datos queda como estaba antes.
                </p>
              </div>
            </div>
          </section>

          <Separator className="my-8" />

           <section>
            <h2 className="text-2xl font-semibold mb-3 text-foreground flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-accent" />
              Beneficios de Usar Transacciones
            </h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Integridad de los Datos:</strong> Se asegura que la información en la base de datos sea siempre correcta y consistente.</li>
              <li><strong className="text-foreground">Confianza:</strong> Reduce la posibilidad de errores que lleven a discrepancias entre el inventario y los registros de ventas.</li>
              <li><strong className="text-foreground">Robustez:</strong> El sistema es más resistente a fallos inesperados durante operaciones críticas.</li>
            </ul>
          </section>

        </CardContent>
      </Card>
    </div>
  );
}

export default function SaleTransactionInfoPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <SaleTransactionInfoPageClient />
    </Suspense>
  );
}
