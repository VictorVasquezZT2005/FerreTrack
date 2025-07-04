
'use client';

import type { Supplier, User } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { deleteSupplierAction } from '@/lib/actions';
import React, { useState, useTransition } from 'react';
import { Loader2, Trash2, Edit3 } from 'lucide-react'; 
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
import { EditSupplierDialog } from './edit-supplier-dialog'; 
import { useAuth } from '@/contexts/auth-context';
import { useTechnicalMode } from '@/contexts/technical-mode-context'; // Import useTechnicalMode

interface SuppliersTableProps {
  suppliers: Supplier[];
  userRole?: User['rol'];
  onSupplierUpdated: (updatedSupplier: Supplier) => void;
  onSupplierDeleted: (supplierId: string) => void;
}

export function SuppliersTable({ suppliers, userRole, onSupplierUpdated, onSupplierDeleted }: SuppliersTableProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { addMongoCommand } = useTechnicalMode(); // Use the hook
  const [isDeleting, setIsDeleting] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();
  const canManageSuppliers = userRole === 'admin' || userRole === 'inventory_manager';

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSupplierForEdit, setSelectedSupplierForEdit] = useState<Supplier | null>(null);

  const handleDeleteSupplier = async (supplierId: string, supplierName: string) => {
    if (!canManageSuppliers) {
      toast({ title: 'Acción no permitida', description: 'No tienes permisos para eliminar proveedores.', variant: 'destructive' });
      return;
    }
    if (!user?.id) {
      toast({ title: 'Error de autenticación', description: 'No se pudo identificar al usuario para la bitácora.', variant: 'destructive' });
      return;
    }

    const simulatedCommand = `db.suppliers.deleteOne({ _id: ObjectId("${supplierId}") }); // Proveedor: ${supplierName}`;
    addMongoCommand(simulatedCommand);

    setIsDeleting(prev => ({ ...prev, [supplierId]: true }));
    startTransition(async () => {
      const result = await deleteSupplierAction(supplierId, supplierName, user.id);
      setIsDeleting(prev => ({ ...prev, [supplierId]: false }));

      if (result.success) {
        onSupplierDeleted(supplierId); 
        toast({
          title: 'Proveedor Eliminado',
          description: `El proveedor "${supplierName}" ha sido eliminado correctamente.`,
        });
      } else {
        toast({
          title: 'Error al Eliminar Proveedor',
          description: result.error || 'Ocurrió un error desconocido.',
          variant: 'destructive',
        });
      }
    });
  };

  const handleOpenEditDialog = (supplierToEdit: Supplier) => {
    if (!canManageSuppliers) return;
    setSelectedSupplierForEdit(supplierToEdit);
    setIsEditDialogOpen(true);
  };

  if (!suppliers || suppliers.length === 0) {
     return <p className="text-muted-foreground text-center py-8">Aún no hay proveedores registrados. ¡Añade algunos para empezar!</p>;
  }

  return (
    <>
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Listado de Proveedores</h2>
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Productos Suministrados</TableHead>
                <TableHead>Últ. Actualización</TableHead>
                {canManageSuppliers && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((supplier) => (
                <TableRow key={supplier.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell>{supplier.telefono || 'N/A'}</TableCell>
                  <TableCell>{supplier.email || 'N/A'}</TableCell>
                  <TableCell>{supplier.contacto || 'N/A'}</TableCell>
                  <TableCell>
                    {supplier.productos_suministrados && supplier.productos_suministrados.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {supplier.productos_suministrados.map(prod => (
                          <Badge key={prod} variant="secondary">{prod}</Badge>
                        ))}
                      </div>
                    ) : 'N/A'}
                  </TableCell>
                  <TableCell>{new Date(supplier.lastUpdated).toLocaleDateString()}</TableCell>
                  {canManageSuppliers && (
                    <TableCell className="text-right space-x-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        aria-label="Editar proveedor"
                        onClick={() => handleOpenEditDialog(supplier)}
                        disabled={isPending || isDeleting[supplier.id]}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive/80"
                            aria-label="Eliminar proveedor"
                            disabled={isPending || isDeleting[supplier.id]}
                          >
                            {isDeleting[supplier.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. Esto eliminará permanentemente al proveedor "{supplier.name}" de tus registros.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeleting[supplier.id] || isPending}>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteSupplier(supplier.id, supplier.name)}
                              disabled={isDeleting[supplier.id] || isPending}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              {isDeleting[supplier.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      {selectedSupplierForEdit && canManageSuppliers && (
        <EditSupplierDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          supplier={selectedSupplierForEdit}
          onSupplierUpdated={(updatedSupplier) => {
            onSupplierUpdated(updatedSupplier); 
            setIsEditDialogOpen(false); 
          }}
        />
      )}
    </>
  );
}

    