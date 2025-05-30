
'use client';

import { SupplierActions } from '@/components/supplier-actions';
import { SuppliersTable } from '@/components/suppliers-table';
import { fetchSuppliersAction } from '@/lib/actions';
import type { Supplier, User } from '@/lib/types';
import React, { useEffect, useState, Suspense } from 'react';
import PageLoading from '@/app/loading';
import { useAuth } from '@/contexts/auth-context'; // Import useAuth

function SuppliersPageClient() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth(); // Get user for role check

  useEffect(() => {
    async function loadSuppliers() {
      setIsLoading(true);
      try {
        const fetchedSuppliers = await fetchSuppliersAction();
        setSuppliers(fetchedSuppliers);
      } catch (error) {
        console.error("Error al obtener proveedores:", error);
      }
      setIsLoading(false);
    }
    loadSuppliers();
  }, []);

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-8">
      <SupplierActions userRole={user?.rol} />
      <SuppliersTable suppliers={suppliers} userRole={user?.rol} />
    </div>
  );
}

export default function SuppliersPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <SuppliersPageClient />
    </Suspense>
  );
}
