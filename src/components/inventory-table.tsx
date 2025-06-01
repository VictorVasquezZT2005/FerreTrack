
'use client';

import type { InventoryItem, User } from '@/lib/types'; // SellingUnit removed
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { deleteInventoryItemAction } from '@/lib/actions'; 
import React, { useState, useMemo, useEffect, useTransition } from 'react';
import { ArrowUpDown, Save, XCircle, Loader2, Search, Trash2, AlertTriangle, FilePenLine, DollarSign } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { EditInventoryItemDialog } from './edit-inventory-item-dialog';
import { useAuth } from '@/contexts/auth-context';

interface InventoryTableProps {
  initialItems: InventoryItem[];
  userRole?: User['rol'];
}

type SortConfig = {
  key: keyof InventoryItem | null;
  direction: 'ascending' | 'descending';
};

export function InventoryTable({ initialItems, userRole }: InventoryTableProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>(initialItems);
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'ascending' });
  const [isDeleting, setIsDeleting] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedItemForEdit, setSelectedItemForEdit] = useState<InventoryItem | null>(null);

  const canManageInventory = userRole === 'admin' || userRole === 'inventory_manager';

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const handleDeleteItem = async (itemId: string, itemName: string, itemCode: string) => {
    if (!canManageInventory) {
      toast({ title: 'Acción no permitida', description: 'No tienes permisos para eliminar artículos.', variant: 'destructive' });
      return;
    }
    if (!user?.id) {
      toast({ title: 'Error de autenticación', description: 'No se pudo identificar al usuario para la bitácora.', variant: 'destructive' });
      return;
    }
    setIsDeleting(prev => ({ ...prev, [itemId]: true }));
    startTransition(async () => {
      const result = await deleteInventoryItemAction(itemId, itemName, itemCode, user.id);
      setIsDeleting(prev => ({ ...prev, [itemId]: false }));

      if (result.success) {
        setItems(prevItems => prevItems.filter(item => item.id !== itemId));
        toast({
          title: 'Artículo Eliminado',
          description: `El artículo "${itemName}" ha sido eliminado correctamente.`,
        });
      } else {
        toast({
          title: 'Error al Eliminar Artículo',
          description: result.error || 'Ocurrió un error desconocido.',
          variant: 'destructive',
        });
      }
    });
  };

  const handleOpenEditDialog = (itemToEdit: InventoryItem) => {
    if (!canManageInventory) return;
    setSelectedItemForEdit(itemToEdit);
    setIsEditDialogOpen(true);
  };


  const requestSort = (key: keyof InventoryItem) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const sortedAndFilteredItems = useMemo(() => {
    let sortableItems = [...items];
    if (filterQuery) {
      const lowerCaseQuery = filterQuery.toLowerCase();
      sortableItems = sortableItems.filter(item =>
        item.name.toLowerCase().includes(lowerCaseQuery) ||
        item.code.toLowerCase().includes(lowerCaseQuery) ||
        (item.category && item.category.toLowerCase().includes(lowerCaseQuery)) ||
        (item.supplier && item.supplier.toLowerCase().includes(lowerCaseQuery)) ||
        item.unitName.toLowerCase().includes(lowerCaseQuery) 
      );
    }

    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key!];
        const valB = b[sortConfig.key!];
        
        let comparison = 0;
        if (valA === undefined && valB !== undefined) comparison = -1;
        else if (valA !== undefined && valB === undefined) comparison = 1;
        else if (valA === undefined && valB === undefined) comparison = 0;
        else if (typeof valA === 'string' && typeof valB === 'string') {
          comparison = valA.localeCompare(valB);
        } else if (typeof valA === 'number' && typeof valB === 'number') {
          comparison = valA - valB;
        }

        return sortConfig.direction === 'ascending' ? comparison : -comparison;
      });
    }
    return sortableItems;
  }, [items, filterQuery, sortConfig]);

  const renderSortIcon = (columnKey: keyof InventoryItem) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown className="ml-2 h-3 w-3 opacity-50" />;
    }
    return sortConfig.direction === 'ascending' ?
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2 h-3 w-3"><path d="m6 15 6-6 6 6"/></svg> :
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2 h-3 w-3"><path d="m6 9 6 6 6-6"/></svg>;
  };


  if (items.length === 0 && initialItems.length === 0 && !filterQuery) {
     return <p className="text-muted-foreground text-center py-8">Aún no hay artículos en el inventario. ¡Añade algunos para empezar!</p>;
  }

  const tableHeaders = [
    { key: 'code', label: 'Código' },
    { key: 'name', label: 'Nombre Artículo' },
    { key: 'quantity', label: 'Stock' },
    { key: 'unitName', label: 'Unidad' },
    { key: 'unitPrice', label: 'Precio Unit.' },
    { key: 'stockMinimo', label: 'Stock Mín.' },
    { key: 'dailySales', label: 'Ventas Diarias Prom.' }, 
    { key: 'category', label: 'Categoría' },
    { key: 'supplier', label: 'Proveedor' },
    { key: 'lastUpdated', label: 'Últ. Act.'}
  ];

  return (
    <TooltipProvider>
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Inventario Actual</h2>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Filtrar por código, nombre, categoría..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="pl-8 py-2"
          />
        </div>
      </div>
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {tableHeaders.map((col) => (
                <TableHead 
                    key={col.key} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors" 
                    onClick={() => requestSort(col.key as keyof InventoryItem )}
                >
                  <div className="flex items-center">
                    {col.label}
                    {renderSortIcon(col.key as keyof InventoryItem)}
                  </div>
                </TableHead>
              ))}
              {canManageInventory && <TableHead>Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAndFilteredItems.length > 0 ? (
              sortedAndFilteredItems.map((item) => {
                const isOutOfStock = item.quantity === 0;
                const isBelowMinStock = item.quantity > 0 && item.quantity <= item.stockMinimo;

                const rowClassName = cn(
                  "hover:bg-muted/50 transition-colors",
                  isOutOfStock ? "bg-red-100 dark:bg-red-900/40 hover:bg-red-100/80 dark:hover:bg-red-900/60" :
                  isBelowMinStock ? "bg-yellow-100 dark:bg-yellow-800/30 hover:bg-yellow-100/80 dark:hover:bg-yellow-800/50" : ""
                );

                const quantityCellClassName = cn(
                  "text-center",
                  isOutOfStock ? "text-red-600 dark:text-red-400 font-bold" :
                  isBelowMinStock ? "text-amber-600 dark:text-amber-400 font-semibold" : ""
                );
                
                return (
                  <TableRow key={item.id} className={rowClassName}>
                    <TableCell className="font-mono text-xs">{item.code}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className={quantityCellClassName}>
                      <div className="flex items-center gap-1 justify-center">
                         {(isOutOfStock || isBelowMinStock) && <AlertTriangle className={cn("h-4 w-4", isOutOfStock ? "text-red-500" : "text-amber-500")} />}
                         {item.quantity}
                      </div>
                    </TableCell>
                    <TableCell>{item.unitName}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <DollarSign className="h-3 w-3 text-muted-foreground" />
                        {item.unitPrice.toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{item.stockMinimo}</TableCell>
                    <TableCell className="text-center">{item.dailySales}</TableCell>
                    <TableCell>
                      {item.category || 
                        (item.code && getCategoryNameByCodePrefix(item.code.substring(0,2))) || 
                        'N/A'}
                    </TableCell>
                    <TableCell>{item.supplier || 'N/A'}</TableCell>
                    <TableCell>{new Date(item.lastUpdated).toLocaleDateString()}</TableCell>
                    {canManageInventory && (
                      <TableCell>
                        <div className="flex gap-1 items-center">
                          {canManageInventory && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleOpenEditDialog(item)}
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              aria-label="Editar artículo"
                              title="Editar Artículo"
                              disabled={isPending || isDeleting[item.id]}
                            >
                              <FilePenLine className="h-4 w-4" />
                            </Button>
                          )}
                          {canManageInventory && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-destructive hover:text-destructive/80"
                                  aria-label="Eliminar artículo"
                                  title="Eliminar Artículo"
                                  disabled={isPending || isDeleting[item.id]}
                                >
                                  {isDeleting[item.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Esto eliminará permanentemente el artículo "{item.name}" (Código: {item.code}) de tus registros.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel disabled={isDeleting[item.id] || isPending}>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteItem(item.id, item.name, item.code)}
                                    disabled={isDeleting[item.id] || isPending}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    {isDeleting[item.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                  <TableCell colSpan={tableHeaders.length + (canManageInventory ? 1 : 0)} className="h-24 text-center text-muted-foreground">
                    {filterQuery ? "Ningún artículo coincide con tus criterios de filtro." : "No hay artículos en el inventario."}
                  </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
    {selectedItemForEdit && canManageInventory && (
      <EditInventoryItemDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        item={selectedItemForEdit}
        onItemUpdated={(updatedItem) => {
          setItems(prevItems => prevItems.map(i => i.id === updatedItem.id ? updatedItem : i));
        }}
      />
    )}
    </TooltipProvider>
  );
}

function getCategoryNameByCodePrefix(prefix: string): string | undefined {
    const CATEGORY_CODES: Record<string, string> = {
      '01': 'Herramientas',
      '02': 'Fontanería',
      '03': 'Electricidad',
      '04': 'Pinturas y Accesorios',
      '05': 'Tornillería y Fijaciones',
      '06': 'Materiales de Construcción',
      '07': 'Jardinería',
      '08': 'Equipo de Seguridad',
      '09': 'Automotriz',
      '10': 'Limpieza',
    };
    return CATEGORY_CODES[prefix];
}
