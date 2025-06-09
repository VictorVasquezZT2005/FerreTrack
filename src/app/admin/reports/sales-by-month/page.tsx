
'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { fetchSalesSummaryByMonthAction } from '@/lib/actions';
import type { SalesSummary, User } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import PageLoading from '@/app/loading';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, DollarSign, Info, CalendarDays, ShieldAlert } from "lucide-react";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTechnicalMode } from '@/contexts/technical-mode-context'; // Import useTechnicalMode

function SalesByMonthReportPageClient() {
  const { user, isLoading: authLoading } = useAuth();
  const { isTechnicalModeActive, addMongoCommand } = useTechnicalMode(); // Use the hook
  const router = useRouter();
  const [summary, setSummary] = useState<SalesSummary[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const aggregationPipelineExplanation = `
[
  {
    $match: { date: { $exists: true, $ne: null } } 
    // Filtra documentos para asegurar que el campo 'date' exista y no sea nulo.
  },
  {
    $addFields: { convertedDate: { $toDate: "$date" } }
    // Convierte el campo 'date' (que es un string ISO) a un tipo Date de MongoDB.
  },
  {
    $match: { convertedDate: { $type: "date" } }
    // Filtra solo los documentos donde la conversión a fecha fue exitosa.
  },
  {
    $group: {
      _id: {
        year: { $year: "$convertedDate" }, // Agrupa por año
        month: { $month: "$convertedDate" } // y por mes
      },
      totalSalesAmount: { $sum: "$totalAmount" }, // Suma el total de ventas para cada grupo
      count: { $sum: 1 } // Cuenta el número de ventas en cada grupo
    }
  },
  {
    $sort: { "_id.year": -1, "_id.month": -1 } 
    // Ordena los resultados: primero por año descendente, luego por mes descendente.
  },
  {
    $project: {
      _id: 0, // Excluye el campo _id generado por $group
      year: "$_id.year",
      month: "$_id.month",
      totalSalesAmount: 1, // Incluye el total de ventas
      numberOfSales: "$count" // Renombra 'count' a 'numberOfSales'
    }
  }
]`;

  useEffect(() => {
    if (!authLoading && user?.rol !== 'admin') {
      router.push('/'); 
      return;
    }

    if (user?.rol === 'admin') {
      async function loadSummary() {
        setIsLoadingData(true);
        setError(null);
        addMongoCommand(`// Fetching Sales Summary by Month (Aggregation):\ndb.sales.aggregate(${aggregationPipelineExplanation.trim()});`);
        try {
          const result = await fetchSalesSummaryByMonthAction();
          if (result.success && result.summary) {
            setSummary(result.summary);
          } else {
            setError(result.error || "No se pudo cargar el resumen de ventas.");
          }
        } catch (err: any) {
          console.error("Error al cargar resumen de ventas:", err);
          setError("Ocurrió una excepción al cargar el resumen.");
        }
        setIsLoadingData(false);
      }
      loadSummary();
    }
  }, [user, authLoading, router, addMongoCommand, aggregationPipelineExplanation]);

  if (authLoading || (user?.rol === 'admin' && isLoadingData)) {
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

  const getMonthName = (monthNumber: number) => {
    const date = new Date();
    date.setMonth(monthNumber - 1);
    return format(date, "MMMM", { locale: es });
  };

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader className="bg-muted/30">
          <div className="flex items-center gap-3">
            <BarChart className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-3xl font-bold text-primary">Reporte de Ventas por Mes</CardTitle>
              <CardDescription className="text-lg">
                Visualiza el total de ventas y el número de transacciones agrupadas por mes y año.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Error al Cargar Reporte</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {summary.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Año</TableHead>
                    <TableHead className="w-[200px]">Mes</TableHead>
                    <TableHead className="text-right">Total Vendido</TableHead>
                    <TableHead className="text-center">Nº de Ventas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.map((item, index) => (
                    <TableRow key={`${item.year}-${item.month}-${index}`}>
                      <TableCell className="font-medium">{item.year}</TableCell>
                      <TableCell className="capitalize">{getMonthName(item.month)}</TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold">${item.totalSalesAmount.toFixed(2)}</span>
                      </TableCell>
                      <TableCell className="text-center">{item.numberOfSales}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            !isLoadingData && <p className="text-muted-foreground text-center py-6">No hay datos de ventas para mostrar.</p>
          )}

          {isTechnicalModeActive && (
            <Card className="mt-8 bg-secondary/20">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Info className="h-5 w-5 text-accent" />
                  Detalles Técnicos: Pipeline de Agregación (MongoDB)
                </CardTitle>
                <CardDescription>
                  Este reporte se genera utilizando el siguiente pipeline de agregación en MongoDB:
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="p-4 bg-muted rounded-md text-xs overflow-x-auto custom-scrollbar">
                  <code>{aggregationPipelineExplanation.trim()}</code>
                </pre>
                <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <p><strong>Explicación de las Etapas:</strong></p>
                  <ul className="list-disc list-inside pl-4 space-y-1">
                    <li><strong><code>$match (1º y 3º)</code>:</strong> Filtran documentos para asegurar que el campo 'date' sea válido y convertible.</li>
                    <li><strong><code>$addFields</code>:</strong> Convierte el string 'date' a un objeto Date de MongoDB para poder usar operadores de fecha.</li>
                    <li><strong><code>$group</code>:</strong> Agrupa los documentos por año y mes. Calcula la suma de <code>totalAmount</code> (ventas totales) y cuenta el número de documentos (ventas) en cada grupo.</li>
                    <li><strong><code>$sort</code>:</strong> Ordena los resultados para mostrar los meses más recientes primero.</li>
                    <li><strong><code>$project</code>:</strong> Remodela los documentos de salida para que tengan un formato más amigable (<code>year</code>, <code>month</code>, <code>totalSalesAmount</code>, <code>numberOfSales</code>).</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SalesByMonthReportPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <SalesByMonthReportPageClient />
    </Suspense>
  );
}

    