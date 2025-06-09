
'use client';

import { useState } from 'react';
import { PlusCircle, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddInventoryItemDialog } from '@/components/add-inventory-item-dialog';
import { UpdateStockDialog } from '@/components/update-stock-dialog';
import type { User, InventoryItem } from '@/lib/types';

interface InventoryActionsProps {
  userRole?: User['rol'];
  onItemAdded: (item: InventoryItem) => void;
  onItemUpdated: (item: InventoryItem) => void; // For stock updates
}

export function InventoryActions({ userRole, onItemAdded, onItemUpdated }: InventoryActionsProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isUpdateStockDialogOpen, setIsUpdateStockDialogOpen] = useState(false);
  
  const canManageInventory = userRole === 'admin' || userRole === 'inventory_manager';

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        {canManageInventory && (
          <Button onClick={() => setIsAddDialogOpen(true)} className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Nuevo Artículo
          </Button>
        )}
        {canManageInventory && (
          <Button onClick={() => setIsUpdateStockDialogOpen(true)} variant="secondary" className="w-full sm:w-auto">
            <Layers className="mr-2 h-4 w-4" /> Registrar Entrada de Stock
          </Button>
        )}
      </div>
      {canManageInventory && 
        <AddInventoryItemDialog 
          open={isAddDialogOpen} 
          onOpenChange={setIsAddDialogOpen} 
          onItemAdded={onItemAdded}
        />}
      {canManageInventory && 
        <UpdateStockDialog 
            open={isUpdateStockDialogOpen} 
            onOpenChange={setIsUpdateStockDialogOpen} 
            onStockUpdated={onItemUpdated} // Pass onItemUpdated as onStockUpdated
        />}
    </>
  );
}
