
'use client';

import type { User } from '@/lib/types';
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
import { useAuth } from '@/contexts/auth-context';
import { deleteUserAction } from '@/lib/actions';
import React, { useState, useTransition } from 'react';
import { Loader2, Trash2, Edit3 } from 'lucide-react'; // Added Edit3 icon
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
import { EditUserDialog } from './edit-user-dialog'; // Import EditUserDialog

interface UsersTableProps {
  users: Omit<User, 'password'>[];
  userRole?: User['rol'];
}

export function UsersTable({ users: initialUsers, userRole }: UsersTableProps) {
  const { toast } = useToast();
  const { user: currentUser } = useAuth(); 
  const [users, setUsers] = useState<Omit<User, 'password'>[]>(initialUsers);
  const [isDeleting, setIsDeleting] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();
  const isAdmin = userRole === 'admin';

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<Omit<User, 'password' | 'lastUpdated'> | null>(null);

  React.useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!isAdmin) {
       toast({ title: 'Acción no permitida', description: 'No tienes permisos para eliminar usuarios.', variant: 'destructive' });
       return;
    }
    if (currentUser?.id === userId) {
      toast({
        title: 'Acción no permitida',
        description: 'No puedes eliminar tu propia cuenta de usuario.',
        variant: 'destructive',
      });
      return;
    }

    setIsDeleting(prev => ({ ...prev, [userId]: true }));
    startTransition(async () => {
      const result = await deleteUserAction(userId);
      setIsDeleting(prev => ({ ...prev, [userId]: false }));

      if (result.success) {
        setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
        toast({
          title: 'Usuario Eliminado',
          description: `El usuario "${userName}" ha sido eliminado correctamente.`,
        });
      } else {
        toast({
          title: 'Error al Eliminar Usuario',
          description: result.error || 'Ocurrió un error desconocido.',
          variant: 'destructive',
        });
      }
    });
  };

  const handleOpenEditDialog = (userToEdit: Omit<User, 'password' | 'lastUpdated'>) => {
    setSelectedUserForEdit(userToEdit);
    setIsEditDialogOpen(true);
  };

  if (!users || users.length === 0) {
     return <p className="text-muted-foreground text-center py-8">Aún no hay usuarios registrados.</p>;
  }

  return (
    <>
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Listado de Usuarios</h2>
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Últ. Actualización</TableHead>
                {isAdmin && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium">{user.nombre}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.rol === 'admin' ? 'default' : 'secondary'}>
                      {user.rol.charAt(0).toUpperCase() + user.rol.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(user.lastUpdated).toLocaleDateString()}</TableCell>
                  {isAdmin && (
                    <TableCell className="text-right space-x-1">
                       <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        aria-label="Editar usuario"
                        onClick={() => handleOpenEditDialog(user)}
                        disabled={isPending || isDeleting[user.id] || currentUser?.id === user.id && user.rol === 'admin' && users.filter(u => u.rol === 'admin').length <=1 } // Disable editing self if last admin
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      {currentUser?.id !== user.id ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive hover:text-destructive/80"
                              aria-label="Eliminar usuario"
                              disabled={isPending || isDeleting[user.id]}
                            >
                              {isDeleting[user.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. Esto eliminará permanentemente al usuario "{user.nombre}" de tus registros.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel disabled={isDeleting[user.id] || isPending}>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteUser(user.id, user.nombre)}
                                disabled={isDeleting[user.id] || isPending}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                {isDeleting[user.id] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground opacity-50 cursor-not-allowed"
                          aria-label="No puedes eliminar tu propia cuenta"
                          disabled
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      {selectedUserForEdit && isAdmin && (
        <EditUserDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          user={selectedUserForEdit}
        />
      )}
    </>
  );
}
