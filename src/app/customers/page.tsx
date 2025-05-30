
'use client';

import { CustomerActions } from '@/components/customer-actions';
import { CustomersTable } from '@/components/customers-table';
import { fetchCustomersAction } from '@/lib/actions';
import type { Customer, User } from '@/lib/types';
import React, { useEffect, useState, Suspense } from 'react';
import PageLoading from '@/app/loading'; // Generic loading component
import { useAuth } from '@/contexts/auth-context';

function CustomersPageClient() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    async function loadCustomers() {
      setIsLoading(true);
      try {
        const fetchedCustomers = await fetchCustomersAction();
        setCustomers(fetchedCustomers);
      } catch (error) {
        console.error("Error al obtener clientes:", error);
        // Potentially show a toast to the user
      }
      setIsLoading(false);
    }
    loadCustomers();
  }, []);

  if (isLoading) {
    return <PageLoading />;
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
