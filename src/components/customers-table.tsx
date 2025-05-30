
'use client';

import type { Customer, User } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { deleteCustomerAction } from '@/lib/actions';
import React, { useState, useTransition } from 'react';
import { Loader2, Trash2, Edit3, Eye } from 'lucide-react';
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
import { EditCustomerDialog } from './edit-customer-dialog'; // Import EditCustomerDialog

interface CustomersTableProps {
  initialCustomers: Customer[];
  userRole?: User['rol'];
  onCustomerUpdated: (updatedCustomer: Customer) => void;
  onCustomerDeleted: (deletedCustomerId: string) => void;
}

export function CustomersTable({ initialCustomers, userRole, onCustomerUpdated, onCustomerDeleted }: CustomersTableProps) {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [isDeleting, setIsDeleting] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();
  
  const isAdmin = userRole === 'admin'; // Only admin can edit or delete

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCustomerForEdit, setSelectedCustomerForEdit] = useState<Customer | null>(null);

  React.useEffect(() => {
    setCustomers(initialCustomers);
  }, [initialCustomers]);

  const handleDeleteCustomer = async (customerId: string, customerName: string) => {
    if (!isAdmin) { // Double check permission
      toast({ title: 'Acción no permitida', description: 'No tienes permisos para eliminar clientes.', variant: 'destructive' });
      return;
    }
    setIsDeleting(prev => ({ ...prev, [customerId]: true }));
    startTransition(async () => {
      const result = await deleteCustomerAction(customerId);
      setIsDeleting(prev => ({ ...prev, [customerId]: false }));

      if (result.success) {
        onCustomerDeleted(customerId); // Update parent state
        toast({
          title: 'Cliente Eliminado',
          description: `El cliente "${customerName}" ha sido eliminado correctamente.`,
        });
      } else {
        toast({
          title: 'Error al Eliminar Cliente',
          description: result.error || 'Ocurrió un error desconocido.',
          variant: 'destructive',
        });
      }
    });
  };

  const handleOpenEditDialog = (customerToEdit: Customer) => {
    if (!isAdmin) return; // Prevent opening if not admin
    setSelectedCustomerForEdit(customerToEdit);
    setIsEditDialogOpen(true);
  };

  if (!customers || customers.length === 0) {
     return <p className="text-muted-foreground text-center py-8">Aún no hay clientes registrados.</p>;
  }

  return (
    <>
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Listado de Clientes</h2>
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>RUC/Cédula</TableHead>
                <TableHead>Dirección</TableHead>
                <TableHead>Registro</TableHead>
                {isAdmin && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>{customer.email || 'N/A'}</TableCell>
                  <TableCell>{customer.phone || 'N/A'}</TableCell>
                  <TableCell>{customer.ruc || 'N/A'}</TableCell>
                  <TableCell className="max-w-xs truncate">{customer.address || 'N/A'}</TableCell>
                  <TableCell>{new Date(customer.registrationDate).toLocaleDateString()}</TableCell>
                  {isAdmin && (
                    <TableCell className="text-right space-x-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        aria-label="Editar cliente"
                        title="Editar Cliente"
                        onClick={() => handleOpenEditDialog(customer)}
                        disabled={isPending || isDeleting[customer.id]}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive/80"
                            aria-label="Eliminar cliente"
                            title="Eliminar Cliente"
                            disabled={isPending || isDeleting[customer.id]}
                          >
                            {isDeleting[customer.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. Esto eliminará permanentemente al cliente "{customer.name}" de tus registros.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeleting[customer.id] || isPending}>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteCustomer(customer.id, customer.name)}
                              disabled={isDeleting[customer.id] || isPending}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              {isDeleting[customer.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
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
      {selectedCustomerForEdit && isAdmin && (
        <EditCustomerDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          customer={selectedCustomerForEdit}
          onCustomerUpdated={(updatedCustomer) => {
            onCustomerUpdated(updatedCustomer); // Update parent state
            setIsEditDialogOpen(false);
          }}
        />
      )}
    </>
  );
}
