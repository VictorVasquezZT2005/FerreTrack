
'use client';

import { SupplierActions } from '@/components/supplier-actions';
import { SuppliersTable } from '@/components/suppliers-table';
import { fetchSuppliersAction } from '@/lib/actions';
import type { Supplier, User } from '@/lib/types';
import React, { useEffect, useState, Suspense, useCallback } from 'react';
import PageLoading from '@/app/loading';
import { useAuth } from '@/contexts/auth-context'; 
import { useTechnicalMode } from '@/contexts/technical-mode-context'; // Import useTechnicalMode

function SuppliersPageClient() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth(); 
  const { addMongoCommand } = useTechnicalMode(); // Use the hook

  const loadSuppliers = useCallback(async (isInitialLoad = false) => {
    setIsLoading(true);
    if (isInitialLoad) {
      addMongoCommand('db.suppliers.find({}).sort({ name: 1 }); // Initial load');
    }
    try {
      const fetchedSuppliers = await fetchSuppliersAction();
      setSuppliers(fetchedSuppliers);
    } catch (error) {
      console.error("Error al obtener proveedores:", error);
    }
    setIsLoading(false);
  }, [addMongoCommand]);

  useEffect(() => {
    loadSuppliers(true); // Pass true for initial load
  }, [loadSuppliers]);

  const handleSupplierAdded = (newSupplier: Supplier) => {
    setSuppliers(prevSuppliers => [newSupplier, ...prevSuppliers].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const handleSupplierUpdated = (updatedSupplier: Supplier) => {
    setSuppliers(prevSuppliers => prevSuppliers.map(s => s.id === updatedSupplier.id ? updatedSupplier : s));
  };

  const handleSupplierDeleted = (deletedSupplierId: string) => {
    setSuppliers(prevSuppliers => prevSuppliers.filter(s => s.id !== deletedSupplierId));
  };

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-8">
      <SupplierActions 
        userRole={user?.rol} 
        onSupplierAdded={handleSupplierAdded} 
      />
      <SuppliersTable 
        suppliers={suppliers} 
        userRole={user?.rol} 
        onSupplierUpdated={handleSupplierUpdated}
        onSupplierDeleted={handleSupplierDeleted}
      />
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

    