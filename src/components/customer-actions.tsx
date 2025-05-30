
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';
import { AddCustomerDialog } from '@/components/add-customer-dialog';
import type { User } from '@/lib/types';

interface CustomerActionsProps {
  userRole?: User['rol'];
}

export function CustomerActions({ userRole }: CustomerActionsProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  // For now, both admin and empleado can add customers. This can be restricted later.
  const canAddCustomer = userRole === 'admin' || userRole === 'empleado';

  return (
    <>
      <div className="mb-6">
        {canAddCustomer && (
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" /> Añadir Nuevo Cliente
          </Button>
        )}
      </div>
      {canAddCustomer && (
        <AddCustomerDialog 
          open={isAddDialogOpen} 
          onOpenChange={setIsAddDialogOpen}
          onCustomerAdded={() => {
            // Typically, the parent page (CustomersPageClient) would re-fetch or update its list.
            // For simplicity here, we might rely on revalidatePath in the server action.
            // Or pass a callback to trigger re-fetch if managing state locally.
          }}
        />
      )}
    </>
  );
}
