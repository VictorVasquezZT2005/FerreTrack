
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

export default function InventoryPageWrapper() {
  const [initialItems, setInitialItems] = useState<InventoryItem[]>([]);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const { user } = useAuth(); 

  const loadInitialItems = useCallback(async () => {
    setIsLoadingInitial(true);
    try {
      const items = await fetchInventoryItems('name', 'asc');
      setInitialItems(items);
    } catch (error) {
      console.error("Error al obtener los artículos iniciales", error);
    }
    setIsLoadingInitial(false);
  }, []); // Empty dependency array means this callback is stable

  useEffect(() => {
    loadInitialItems();
  }, [loadInitialItems]); // loadInitialItems is now stable


  if (isLoadingInitial) {
     return <PageLoading />;
  }


  return (
    <Suspense fallback={<PageLoading />}>
      <InventoryPageClient
        initialItems={initialItems}
        userRole={user?.rol} 
      />
    </Suspense>
  );
}


interface InventoryPageClientProps {
  initialItems: InventoryItem[];
  userRole?: 'admin' | 'empleado' | 'inventory_manager'; 
}

function InventoryPageClient({ initialItems, userRole }: InventoryPageClientProps) {
  const [items, setItems] = useState<InventoryItem[]>(initialItems);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeInventoryTrendsOutput | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // const [isPending, startTransition] = useTransition(); // isPending from useTransition is not used, remove if not needed later
  const { toast } = useToast();
  const { user } = useAuth();
  
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const handleAnalyzeTrendsClient = async () => {
    if (!items || items.length === 0) {
      toast({ title: "No hay datos", description: "No hay artículos en el inventario para analizar.", variant: "default" });
      return;
    }
    if (!user?.id) {
        toast({ title: "Error de autenticación", description: "No se pudo identificar al usuario para la bitácora de análisis.", variant: "destructive" });
        return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null); 
    
    const analysisInput: AnalyzeInventoryTrendsInput = items.map(item => ({
      item: item.name,
      quantity: item.quantity, // This is in the item's defined unit
      stockMinimo: item.stockMinimo, // This is in the item's defined unit
      dailySales: item.dailySales, // This is in the item's defined unit
    }));

    try {
      const result = await analyzeInventoryTrends(analysisInput);
      setAnalysisResult(result);
      toast({ title: "Análisis Completado", description: "Se han analizado las tendencias del inventario." });
      await logAuditAction(user.id, 'ANALYZE_INVENTORY_TRENDS', { itemCount: items.length, hasPredictions: result.stockoutPredictions.length > 0 });
    } catch (error: any) {
      console.error("Error al analizar tendencias:", error);
      toast({ title: "Error de Análisis", description: error.message || "No se pudieron analizar las tendencias.", variant: "destructive" });
      await logAuditAction(user.id, 'ANALYZE_INVENTORY_TRENDS_ERROR', { itemCount: items.length, error: error.message });
    }
    setIsAnalyzing(false);
  };


  return (
    <div className="space-y-8">
      <InventoryActions 
        userRole={userRole}
      />
      <div className="flex justify-end mb-4">
        {(userRole === 'admin' || userRole === 'inventory_manager') && (
            <Button onClick={handleAnalyzeTrendsClient} disabled={isAnalyzing}>
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
      <InventoryTable initialItems={items} userRole={userRole} />
      {analysisResult && <TrendAnalysisCard analysisResult={analysisResult} />}
    </div>
  );
}
