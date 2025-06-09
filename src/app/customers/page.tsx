
'use client';

import { CustomerActions } from '@/components/customer-actions';
import { CustomersTable } from '@/components/customers-table';
import { fetchCustomersAction } from '@/lib/actions';
import type { Customer } from '@/lib/types';
import React, { useEffect, useState, Suspense, useCallback } from 'react';
import PageLoading from '@/app/loading';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert } from "lucide-react";
import { useTechnicalMode } from '@/contexts/technical-mode-context'; // Import useTechnicalMode

function CustomersPageClient() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isLoading: authLoading } = useAuth();
  const { addMongoCommand } = useTechnicalMode(); // Use the hook
  const router = useRouter();

  const loadCustomers = useCallback(async (isInitialLoad = false) => {
    setIsLoading(true);
    if (isInitialLoad) {
        addMongoCommand('db.customers.find({}).sort({ name: 1 }); // Initial load');
    }
    try {
      const fetchedCustomers = await fetchCustomersAction();
      setCustomers(fetchedCustomers);
    } catch (error) {
      console.error("Error al obtener clientes:", error);
    }
    setIsLoading(false);
  }, [addMongoCommand]);


  useEffect(() => {
    if (!authLoading && user && user.rol === 'inventory_manager') {
      router.push('/'); 
      return;
    }

    if (!authLoading && user && (user.rol === 'admin' || user.rol === 'empleado')) {
      loadCustomers(true); // Pass true for initial load
    } else if (!authLoading && !user) {
        router.push('/login');
    } else if (!authLoading && user && user.rol !== 'admin' && user.rol !== 'empleado') {
        router.push('/');
    }
  }, [user, authLoading, router, loadCustomers]);

  const handleCustomerAdded = (newCustomer: Customer) => {
    setCustomers(prev => [newCustomer, ...prev].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const handleCustomerUpdated = (updatedCustomer: Customer) => {
    setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
  };

  const handleCustomerDeleted = (deletedCustomerId: string) => {
    setCustomers(prev => prev.filter(c => c.id !== deletedCustomerId));
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
      <CustomerActions 
        userRole={user?.rol} 
        onCustomerAdded={handleCustomerAdded} 
      />
      <CustomersTable 
        initialCustomers={customers} 
        userRole={user?.rol} 
        onCustomerUpdated={handleCustomerUpdated}
        onCustomerDeleted={handleCustomerDeleted}
      />
    </div>
  );
}

export default function CustomersPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <CustomersPageClient />
    </Suspense>
  );
}

    