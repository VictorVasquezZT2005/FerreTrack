
'use client';

import type { Sale, User } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Eye, Trash2, Loader2, Edit3 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useState, useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { deleteSaleAction } from '@/lib/actions';
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
import { EditSaleDialog } from './edit-sale-dialog'; // Import EditSaleDialog

interface SalesTableProps {
  sales: Sale[];
  userRole?: User['rol'];
  onSaleDeleted: (deletedSaleId: string) => void;
  onSaleUpdated: (updatedSale: Sale) => void; // Callback for updates
}

export function SalesTable({ sales, userRole, onSaleDeleted, onSaleUpdated }: SalesTableProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();
  const isAdmin = userRole === 'admin';

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSaleForEdit, setSelectedSaleForEdit] = useState<Sale | null>(null);


  if (!sales || sales.length === 0) {
    return <p className="text-muted-foreground text-center py-8">Aún no hay ventas registradas.</p>;
  }

  const handleDeleteSale = async (saleId: string, saleNumber: string) => {
    if (!isAdmin) {
      toast({ title: 'Acción no permitida', description: 'No tienes permisos para eliminar ventas.', variant: 'destructive' });
      return;
    }
    setIsDeleting(prev => ({ ...prev, [saleId]: true }));
    startTransition(async () => {
      const result = await deleteSaleAction(saleId);
      setIsDeleting(prev => ({ ...prev, [saleId]: false }));

      if (result.success) {
        onSaleDeleted(saleId);
        toast({
          title: 'Venta Eliminada',
          description: `La venta número "${saleNumber}" ha sido eliminada y el stock restaurado.`,
        });
      } else {
        toast({
          title: 'Error al Eliminar Venta',
          description: result.error || 'Ocurrió un error desconocido.',
          variant: 'destructive',
        });
      }
    });
  };

  const handleOpenEditDialog = (saleToEdit: Sale) => {
    if (!isAdmin) return; // Only admin can open edit dialog
    setSelectedSaleForEdit(saleToEdit);
    setIsEditDialogOpen(true);
  };

  const handleSaleUpdatedInDialog = (updatedSale: Sale) => {
    onSaleUpdated(updatedSale); // Call parent callback to update state
    setIsEditDialogOpen(false);
    // Toast for update success is handled in EditSaleDialog or the action itself
  };


  return (
    <>
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nº Venta</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="text-center">Método Pago</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-center">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sales.map((sale) => (
            <TableRow key={sale.id} className="hover:bg-muted/50 transition-colors">
              <TableCell className="font-medium">
                <Badge variant="outline">{sale.saleNumber}</Badge>
              </TableCell>
              <TableCell>{format(new Date(sale.date), "dd MMM yyyy, HH:mm", { locale: es })}</TableCell>
              <TableCell>{sale.customerName || 'Consumidor Final'}</TableCell>
              <TableCell className="text-center">
                <Badge variant={sale.paymentMethod === 'tarjeta' ? 'secondary' : 'outline'}>
                  {sale.paymentMethod && typeof sale.paymentMethod === 'string' && sale.paymentMethod.length > 0
                    ? sale.paymentMethod.charAt(0).toUpperCase() + sale.paymentMethod.slice(1)
                    : 'Desconocido'}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-semibold">${sale.totalAmount.toFixed(2)}</TableCell>
              <TableCell className="text-center space-x-1">
                <Button asChild variant="ghost" size="sm" className="h-8 w-auto px-2">
                  <Link href={`/sales/${sale.id}`} title="Ver Detalle/Factura">
                    <Eye className="h-4 w-4" /> 
                    <span className="sr-only sm:not-sr-only sm:ml-1">Factura</span>
                  </Link>
                </Button>
                {isAdmin && ( // Only show edit button for admins
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    aria-label="Editar venta"
                    title="Editar Venta"
                    onClick={() => handleOpenEditDialog(sale)}
                    disabled={isPending || isDeleting[sale.id]}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                )}
                {isAdmin && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive/80"
                        aria-label="Eliminar venta"
                        title="Eliminar Venta"
                        disabled={isPending || isDeleting[sale.id]}
                      >
                        {isDeleting[sale.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción no se puede deshacer. Esto eliminará permanentemente la venta número "{sale.saleNumber}" 
                          y restaurará las cantidades de los artículos vendidos al inventario.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting[sale.id] || isPending}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteSale(sale.id, sale.saleNumber)}
                          disabled={isDeleting[sale.id] || isPending}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          {isDeleting[sale.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Eliminar Venta
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
     {selectedSaleForEdit && isAdmin && ( // Only mount/render dialog if admin
        <EditSaleDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          sale={selectedSaleForEdit}
          onSaleUpdated={handleSaleUpdatedInDialog}
        />
      )}
    </>
  );
}
