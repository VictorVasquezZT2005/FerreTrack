
'use client';

import { fetchInventoryItems, logAuditAction } from '@/lib/actions'; 
import { InventoryTable } from '@/components/inventory-table';
import { InventoryActions } from '@/components/inventory-actions';
import type { InventoryItem } from '@/lib/types';
import { Suspense } from 'react';
import PageLoading from './loading'; 
import React, { useState, useTransition, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { analyzeInventoryTrends } from '@/ai/flows/analyze-inventory-trends';
import type { AnalyzeInventoryTrendsInput, AnalyzeInventoryTrendsOutput } from '@/ai/flows/analyze-inventory-trends';
import { TrendAnalysisCard } from '@/components/trend-analysis-card';
import { Button } from '@/components/ui/button'; 
import { Loader2, BarChart3 } from 'lucide-react'; 
import { useTechnicalMode } from '@/contexts/technical-mode-context'; // Import useTechnicalMode


export default function InventoryPageWrapper() {
  const [items, setItems] = useState<InventoryItem[]>([]); 
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const { user } = useAuth(); 
  const { addMongoCommand } = useTechnicalMode(); // Use the hook

  const loadItems = useCallback(async (isInitialLoad = false) => { 
    setIsLoadingInitial(true);
    if(isInitialLoad) {
        addMongoCommand('db.inventoryItems.find({}).sort({ name: 1 }); // Initial load');
    }
    try {
      const fetchedItems = await fetchInventoryItems('name', 'asc');
      setItems(fetchedItems);
    } catch (error) {
      console.error("Error al obtener los artículos iniciales", error);
    }
    setIsLoadingInitial(false);
  }, [addMongoCommand]);

  useEffect(() => {
    loadItems(true); // Pass true for initial load
  }, [loadItems]);


  if (isLoadingInitial) {
     return <PageLoading />;
  }

  const handleItemAdded = (newItem: InventoryItem) => {
    setItems(prevItems => [newItem, ...prevItems].sort((a, b) => a.name.localeCompare(b.name))); 
  };

  const handleItemUpdated = (updatedItem: InventoryItem) => {
    setItems(prevItems => prevItems.map(item => item.id === updatedItem.id ? updatedItem : item));
  };
  
  const handleItemDeleted = (deletedItemId: string) => {
    setItems(prevItems => prevItems.filter(item => item.id !== deletedItemId));
  };

  return (
    <Suspense fallback={<PageLoading />}>
      <InventoryPageClient
        currentItems={items} 
        userRole={user?.rol} 
        onItemAdded={handleItemAdded}
        onItemUpdated={handleItemUpdated}
        onItemDeleted={handleItemDeleted}
        refreshItems={loadItems} 
      />
    </Suspense>
  );
}


interface InventoryPageClientProps {
  currentItems: InventoryItem[];
  userRole?: 'admin' | 'empleado' | 'inventory_manager'; 
  onItemAdded: (item: InventoryItem) => void;
  onItemUpdated: (item: InventoryItem) => void;
  onItemDeleted: (itemId: string) => void;
  refreshItems: () => void; 
}

function InventoryPageClient({ 
  currentItems, 
  userRole, 
  onItemAdded, 
  onItemUpdated, 
  onItemDeleted,
  refreshItems
}: InventoryPageClientProps) {
  const [analysisResult, setAnalysisResult] = useState<AnalyzeInventoryTrendsOutput | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  
  const handleAnalyzeTrendsClient = async () => {
    if (!currentItems || currentItems.length === 0) {
      toast({ title: "No hay datos", description: "No hay artículos en el inventario para analizar.", variant: "default" });
      return;
    }
    if (!user?.id) {
        toast({ title: "Error de autenticación", description: "No se pudo identificar al usuario para la bitácora de análisis.", variant: "destructive" });
        return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null); 
    
    const analysisInput: AnalyzeInventoryTrendsInput = currentItems.map(item => ({
      item: item.name,
      quantity: item.quantity,
      stockMinimo: item.stockMinimo,
      dailySales: item.dailySales,
    }));

    try {
      const result = await analyzeInventoryTrends(analysisInput);
      setAnalysisResult(result);
      toast({ title: "Análisis Completado", description: "Se han analizado las tendencias del inventario." });
      await logAuditAction(user.id, 'ANALYZE_INVENTORY_TRENDS', { itemCount: currentItems.length, hasPredictions: result.stockoutPredictions.length > 0 });
    } catch (error: any) {
      console.error("Error al analizar tendencias:", error);
      toast({ title: "Error de Análisis", description: error.message || "No se pudieron analizar las tendencias.", variant: "destructive" });
      await logAuditAction(user.id, 'ANALYZE_INVENTORY_TRENDS_ERROR', { itemCount: currentItems.length, error: error.message });
    }
    setIsAnalyzing(false);
  };


  return (
    <div className="space-y-8">
      <InventoryActions 
        userRole={userRole}
        onItemAdded={onItemAdded}
        onItemUpdated={onItemUpdated} 
      />
      <div className="flex justify-end mb-4">
        {(userRole === 'admin' || userRole === 'inventory_manager') && (
            <Button onClick={handleAnalyzeTrendsClient} disabled={isAnalyzing || currentItems.length === 0}>
            {isAnalyzing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <BarChart3 className="mr-2 h-4 w-4" />
            )}
            Analizar Tendencias de Inventario (IA)
            </Button>
        )}
      </div>
      {isAnalyzing && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="mr-2 h-6 w-6 animate-spin text-primary" />
          <p className="text-muted-foreground">Analizando inventario con IA, por favor espera...</p>
        </div>
      )}
      <InventoryTable 
        initialItems={currentItems} 
        userRole={userRole} 
        onItemUpdated={onItemUpdated} 
        onItemDeleted={onItemDeleted}
      />
      {analysisResult && <TrendAnalysisCard analysisResult={analysisResult} />}
    </div>
  );
}

    