
'use client';

import React, { useEffect, useState, Suspense, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SalesTable } from '@/components/sales-table'; 
import { fetchSalesAction } from '@/lib/actions';
import type { Sale } from '@/lib/types'; 
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import PageLoading from '@/app/loading'; 
import { PlusCircle, History, ShieldAlert } from 'lucide-react'; 
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTechnicalMode } from '@/contexts/technical-mode-context'; // Import useTechnicalMode

function SalesPageClient() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isLoading: authLoading } = useAuth();
  const { addMongoCommand } = useTechnicalMode(); // Use the hook
  const router = useRouter();

  const loadSales = useCallback(async (isInitialLoad = false) => {
    setIsLoading(true);
    if (isInitialLoad) {
      addMongoCommand('db.sales.find({}).sort({ date: -1 }); // Initial load');
    }
    try {
      const fetchedSales = await fetchSalesAction();
      setSales(fetchedSales);
    } catch (error) {
      console.error("Error al obtener las ventas:", error);
    }
    setIsLoading(false);
  }, [addMongoCommand]);

  useEffect(() => {
    if (!authLoading && user && user.rol === 'inventory_manager') {
      router.push('/'); 
      return;
    }
    
    if (!authLoading && user && (user.rol === 'admin' || user.rol === 'empleado')) {
      loadSales(true); // Pass true for initial load
    } else if (!authLoading && !user) {
      router.push('/login');
    } else if (!authLoading && user && user.rol !== 'admin' && user.rol !== 'empleado') {
        router.push('/');
    }
  }, [user, authLoading, router, loadSales]);

  const handleSaleDeleted = (deletedSaleId: string) => {
    setSales(prevSales => prevSales.filter(sale => sale.id !== deletedSaleId));
  };

  const handleSaleUpdated = (updatedSale: Sale) => {
    setSales(prevSales => prevSales.map(sale => sale.id === updatedSale.id ? updatedSale : sale));
  };

  if (authLoading || isLoading) {
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
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <History className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="text-3xl font-bold">Ventas</CardTitle>
                <CardDescription>Consulta y gestiona todas las ventas registradas.</CardDescription>
              </div>
            </div>
            {(user?.rol === 'admin' || user?.rol === 'empleado') && (
              <Button asChild size="lg">
                <Link href="/sales/create">
                  <PlusCircle className="mr-2 h-5 w-5" /> Registrar Nueva Venta
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <SalesTable 
            sales={sales} 
            userRole={user?.rol}
            onSaleDeleted={handleSaleDeleted} 
            onSaleUpdated={handleSaleUpdated}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default function SalesPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <SalesPageClient />
    </Suspense>
  );
}

    