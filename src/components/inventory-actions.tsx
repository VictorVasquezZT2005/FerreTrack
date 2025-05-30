
'use client';

import { useState } from 'react';
import { PlusCircle, Layers } from 'lucide-react'; // Removed BarChartBig, Loader2
import { Button } from '@/components/ui/button';
import { AddInventoryItemDialog } from '@/components/add-inventory-item-dialog';
import { UpdateStockDialog } from '@/components/update-stock-dialog';
import type { User } from '@/lib/types';

interface InventoryActionsProps {
  // Removed onAnalyzeTrends and isAnalyzing props
  userRole?: User['rol'];
}

export function InventoryActions({ userRole }: InventoryActionsProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isUpdateStockDialogOpen, setIsUpdateStockDialogOpen] = useState(false);
  const isAdmin = userRole === 'admin';

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        {isAdmin && (
          <Button onClick={() => setIsAddDialogOpen(true)} className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Nuevo Artículo
          </Button>
        )}
        {isAdmin && (
          <Button onClick={() => setIsUpdateStockDialogOpen(true)} variant="secondary" className="w-full sm:w-auto">
            <Layers className="mr-2 h-4 w-4" /> Registrar Entrada de Stock
          </Button>
        )}
        {/* Removed Analyze Trends Button */}
      </div>
      {isAdmin && <AddInventoryItemDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />}
      {isAdmin && <UpdateStockDialog open={isUpdateStockDialogOpen} onOpenChange={setIsUpdateStockDialogOpen} />}
    </>
  );
}
