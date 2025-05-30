
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { AddSupplierDialog } from '@/components/add-supplier-dialog';
import type { User } from '@/lib/types';

interface SupplierActionsProps {
  userRole?: User['rol'];
}

export function SupplierActions({ userRole }: SupplierActionsProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const isAdmin = userRole === 'admin';

  return (
    <>
      <div className="mb-6">
        {isAdmin && (
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Proveedor
          </Button>
        )}
      </div>
      {isAdmin && <AddSupplierDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />}
    </>
  );
}
