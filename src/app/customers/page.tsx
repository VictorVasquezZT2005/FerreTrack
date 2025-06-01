
'use client';

import { CustomerActions } from '@/components/customer-actions';
import { CustomersTable } from '@/components/customers-table';
import { fetchCustomersAction } from '@/lib/actions';
import type { Customer } from '@/lib/types';
import React, { useEffect, useState, Suspense } from 'react';
import PageLoading from '@/app/loading';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert } from "lucide-react";

function CustomersPageClient() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user && user.rol === 'inventory_manager') {
      router.push('/'); // Redirect inventory_manager
      return;
    }

    if (!authLoading && user && (user.rol === 'admin' || user.rol === 'empleado')) {
      async function loadCustomers() {
        setIsLoading(true);
        try {
          const fetchedCustomers = await fetchCustomersAction();
          setCustomers(fetchedCustomers);
        } catch (error) {
          console.error("Error al obtener clientes:", error);
        }
        setIsLoading(false);
      }
      loadCustomers();
    } else if (!authLoading && !user) {
        // If user is not loaded and not authLoading, means user is null, redirect to login (handled by AuthGuard already)
        // but if they somehow land here.
        router.push('/login');
    } else if (!authLoading && user && user.rol !== 'admin' && user.rol !== 'empleado') {
        // Fallback for other roles that might exist but shouldn't see this
        router.push('/');
    }


  }, [user, authLoading, router]);

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
      <CustomerActions userRole={user?.rol} />
      <CustomersTable 
        initialCustomers={customers} 
        userRole={user?.rol} 
        onCustomerUpdated={(updatedCustomer) => {
          setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
        }}
        onCustomerDeleted={(deletedCustomerId) => {
          setCustomers(prev => prev.filter(c => c.id !== deletedCustomerId));
        }}
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
