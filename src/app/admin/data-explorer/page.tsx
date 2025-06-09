
'use client';

import React, { useEffect, useState, Suspense, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import PageLoading from '@/app/loading';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"; // Not used for JSON view
import { ScrollArea } from '@/components/ui/scroll-area';
import { fetchAdminCollectionDataAction } from '@/lib/actions';
import type { AllowedCollectionNames, User } from '@/lib/types';
import { DatabaseZap, ShieldAlert, Search, ChevronLeft, ChevronRight, Loader2, ListFilter, FilterX } from 'lucide-react';

const COLLECTIONS_CONFIG: { value: AllowedCollectionNames; label: string }[] = [
  { value: 'inventoryItems', label: 'Inventario (inventoryItems)' },
  { value: 'sales', label: 'Ventas (sales)' },
  { value: 'users', label: 'Usuarios (users)' },
  { value: 'customers', label: 'Clientes (customers)' },
  { value: 'suppliers', label: 'Proveedores (suppliers)' },
  { value: 'auditLogs', label: 'Bitácora de Auditoría (auditLogs)' },
];

const DEFAULT_LIMIT = 10;

function AdminDataExplorerPageClient() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [selectedCollection, setSelectedCollection] = useState<AllowedCollectionNames | ''>('');
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [filterById, setFilterById] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [limit] = useState(DEFAULT_LIMIT);

  const totalPages = Math.ceil(totalDocuments / limit);

  const fetchData = useCallback(async () => {
    if (!selectedCollection) {
      setDocuments([]);
      setTotalDocuments(0);
      setCurrentPage(1);
      return;
    }
    setIsLoadingData(true);
    setError(null);
    try {
      const result = await fetchAdminCollectionDataAction({
        collectionName: selectedCollection,
        page: currentPage,
        limit,
        filterById: filterById.trim() || undefined,
      });

      if (result.success && result.documents) {
        setDocuments(result.documents);
        setTotalDocuments(result.totalDocuments || 0);
      } else {
        setError(result.error || "No se pudieron cargar los datos de la colección.");
        setDocuments([]);
        setTotalDocuments(0);
      }
    } catch (err: any) {
      setError("Ocurrió una excepción al cargar los datos: " + err.message);
      setDocuments([]);
      setTotalDocuments(0);
    }
    setIsLoadingData(false);
  }, [selectedCollection, currentPage, limit, filterById]);

  useEffect(() => {
    if (!authLoading && user?.rol !== 'admin') {
      router.push('/'); 
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (selectedCollection) {
      setCurrentPage(1); // Reset to page 1 when collection or filter changes
      fetchData();
    } else {
      setDocuments([]); // Clear documents if no collection is selected
      setTotalDocuments(0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCollection, filterById]); // Fetch data when collection or ID filter changes, page reset handled above

  useEffect(() => {
    if (selectedCollection) {
        fetchData(); // Refetch when page changes for an already selected collection
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);


  if (authLoading) {
    return <PageLoading />;
  }

  if (user?.rol !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Alert variant="destructive" className="max-w-md text-center">
          <ShieldAlert className="h-5 w-5 mx-auto mb-2" />
          <AlertTitle className="text-xl">Acceso Denegado</AlertTitle>
          <AlertDescription>
            No tienes permisos para acceder a esta sección. Esta página es solo para administradores.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleFilterSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCurrentPage(1); // Reset page to 1 on new filter submission
    fetchData();
  };
  
  const clearFilter = () => {
    setFilterById('');
    // Fetching will be triggered by useEffect watching filterById
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader className="bg-muted/30">
          <div className="flex items-center gap-3">
            <DatabaseZap className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-3xl font-bold text-primary">Visor de Datos Avanzado</CardTitle>
              <CardDescription className="text-lg">
                Explora los datos crudos de las colecciones de MongoDB (Solo lectura).
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="collectionSelect" className="text-base">Seleccionar Colección:</Label>
              <Select
                value={selectedCollection}
                onValueChange={(value) => setSelectedCollection(value as AllowedCollectionNames | '')}
              >
                <SelectTrigger id="collectionSelect">
                  <SelectValue placeholder="Elige una colección..." />
                </SelectTrigger>
                <SelectContent>
                  {COLLECTIONS_CONFIG.map(col => (
                    <SelectItem key={col.value} value={col.value}>{col.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <form onSubmit={handleFilterSubmit} className="space-y-1.5">
              <Label htmlFor="filterByIdInput" className="text-base">Filtrar por ID de Documento (Opcional):</Label>
              <div className="flex gap-2">
                <Input
                  id="filterByIdInput"
                  placeholder="Introduce un ObjectId..."
                  value={filterById}
                  onChange={(e) => setFilterById(e.target.value)}
                  disabled={!selectedCollection || isLoadingData}
                />
                <Button type="submit" disabled={!selectedCollection || isLoadingData} className="px-3">
                  <Search className="h-4 w-4 mr-0 sm:mr-2" /><span className="hidden sm:inline">Filtrar</span>
                </Button>
                {filterById && (
                    <Button variant="outline" onClick={clearFilter} type="button" disabled={isLoadingData} className="px-3">
                        <FilterX className="h-4 w-4 mr-0 sm:mr-2" /><span className="hidden sm:inline">Limpiar</span>
                    </Button>
                )}
              </div>
            </form>
          </div>

          {error && (
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Error al Cargar Datos</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isLoadingData && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-10 w-10 text-primary animate-spin mr-3" />
              <p className="text-muted-foreground text-lg">Cargando documentos...</p>
            </div>
          )}

          {!isLoadingData && selectedCollection && documents.length === 0 && !error && (
            <p className="text-muted-foreground text-center py-6">
              {filterById ? `No se encontraron documentos con el ID "${filterById}" en la colección "${selectedCollection}".` : `La colección "${selectedCollection}" está vacía o no hay documentos que mostrar.`}
            </p>
          )}

          {!isLoadingData && documents.length > 0 && (
            <>
              <p className="text-sm text-muted-foreground">Mostrando {documents.length} de {totalDocuments} documento(s) en la colección "{selectedCollection}".</p>
              <ScrollArea className="h-[500px] w-full border rounded-md p-1 bg-secondary/20 custom-scrollbar">
                {documents.map((doc, index) => (
                  <Card key={doc.id || index} className="mb-3 bg-card shadow-sm">
                    <CardContent className="p-3">
                      <pre className="text-xs whitespace-pre-wrap break-all">
                        {JSON.stringify(doc, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                ))}
              </ScrollArea>
              {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1 || isLoadingData}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages || isLoadingData}
                  >
                    Siguiente <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminDataExplorerPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AdminDataExplorerPageClient />
    </Suspense>
  );
}
