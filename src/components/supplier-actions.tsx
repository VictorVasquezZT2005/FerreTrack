
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { AddSupplierDialog } from '@/components/add-supplier-dialog';
import type { User, Supplier } from '@/lib/types'; // Added Supplier type

interface SupplierActionsProps {
  userRole?: User['rol'];
  onSupplierAdded: (newSupplier: Supplier) => void; // Callback prop
}

export function SupplierActions({ userRole, onSupplierAdded }: SupplierActionsProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const canManageSuppliers = userRole === 'admin' || userRole === 'inventory_manager';

  return (
    <>
      <div className="mb-6">
        {canManageSuppliers && (
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Proveedor
          </Button>
        )}
      </div>
      {canManageSuppliers && 
        <AddSupplierDialog 
            open={isAddDialogOpen} 
            onOpenChange={setIsAddDialogOpen} 
            onSupplierAdded={onSupplierAdded} // Pass callback
        />}
    </>
  );
}
