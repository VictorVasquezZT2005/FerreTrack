
'use client';
// The "use client" directive must be at the top of the file.

import { fetchInventoryItems } from '@/lib/actions';
import { InventoryTable } from '@/components/inventory-table';
import { InventoryActions } from '@/components/inventory-actions';
import type { InventoryItem } from '@/lib/types';
import { Suspense } from 'react';
import PageLoading from './loading'; // Use the specific loading component
import React, { useState, useTransition, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';

// Removed imports and logic related to trend analysis

export default function InventoryPageWrapper() {
  const [initialItems, setInitialItems] = useState<InventoryItem[]>([]);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const { user } = useAuth(); // Get user for role check

  useEffect(() => {
    async function loadInitialItems() {
      setIsLoadingInitial(true);
      try {
        const items = await fetchInventoryItems('name', 'asc');
        setInitialItems(items);
      } catch (error) {
        console.error("Error al obtener los artículos iniciales", error);
        // Consider adding a toast or user-facing error message here
      }
      setIsLoadingInitial(false);
    }
    loadInitialItems();
  }, []);


  if (isLoadingInitial && !user) { // Also check user to prevent flash of loading if auth is still resolving
    return <PageLoading />;
  }
  
  // If user is loaded and still loading items, show loading.
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
  userRole?: 'admin' | 'empleado';
}

function InventoryPageClient({ initialItems, userRole }: InventoryPageClientProps) {
  const [items, setItems] = useState<InventoryItem[]>(initialItems);
  // Removed analysisResult, isAnalyzing, and handleAnalyzeTrendsClient
  const [isPending, startTransition] = useTransition(); // isPending might be unused if no transitions are started
  const { toast } = useToast();
  
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  // handleAnalyzeTrendsClient function was removed

  return (
    <div className="space-y-8">
      <InventoryActions 
        // onAnalyzeTrends and isAnalyzing props were removed from InventoryActions call
        userRole={userRole}
      />
      <InventoryTable initialItems={items} userRole={userRole} />
      {/* TrendAnalysisCard and related loading messages were removed */}
    </div>
  );
}
