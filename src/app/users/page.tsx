
'use client';

import { UserActions } from '@/components/user-actions';
import { UsersTable } from '@/components/users-table';
import { fetchUsersAction } from '@/lib/actions';
import type { User } from '@/lib/types';
import React, { useEffect, useState, Suspense, useCallback } from 'react';
import PageLoading from '@/app/loading';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation'; 
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useTechnicalMode } from '@/contexts/technical-mode-context'; // Import useTechnicalMode

function UsersPageClient() {
  const [users, setUsers] = useState<Omit<User, 'password'>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const { addMongoCommand } = useTechnicalMode(); // Use the hook
  const router = useRouter();

  const loadUsers = useCallback(async (isInitialLoad = false) => {
    setIsLoading(true);
    if (isInitialLoad) {
      addMongoCommand('db.users.find({}).sort({ nombre: 1 }); // Initial load, passwords omitted.');
    }
    try {
      const fetchedUsers = await fetchUsersAction();
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("Error al obtener usuarios:", error);
    }
    setIsLoading(false);
  }, [addMongoCommand]);

  useEffect(() => {
    if (!authLoading && currentUser?.rol !== 'admin') {
      router.push('/'); 
      return;
    }

    if (currentUser?.rol === 'admin') {
      loadUsers(true); // Pass true for initial load
    }
  }, [currentUser, authLoading, router, loadUsers]);

  const handleUserAdded = (newUser: Omit<User, 'password'>) => {
    setUsers(prevUsers => [newUser, ...prevUsers].sort((a,b) => a.nombre.localeCompare(b.nombre)));
  };

  const handleUserUpdated = (updatedUser: Omit<User, 'password'>) => {
    setUsers(prevUsers => prevUsers.map(u => u.id === updatedUser.id ? updatedUser : u));
  };

  const handleUserDeleted = (deletedUserId: string) => {
    setUsers(prevUsers => prevUsers.filter(u => u.id !== deletedUserId));
  };


  if (authLoading || (currentUser?.rol === 'admin' && isLoading)) {
    return <PageLoading />;
  }

  if (currentUser?.rol !== 'admin') {
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
            <Alert variant="destructive" className="max-w-md">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Acceso Denegado</AlertTitle>
                <AlertDescription>
                No tienes permisos para acceder a esta sección.
                </AlertDescription>
            </Alert>
        </div>
    );
  }
  
  return (
    <div className="space-y-8">
      <UserActions 
        userRole={currentUser?.rol} 
        onUserAdded={handleUserAdded}
      />
      <UsersTable 
        users={users} 
        userRole={currentUser?.rol} 
        onUserUpdated={handleUserUpdated}
        onUserDeleted={handleUserDeleted}
      />
    </div>
  );
}

export default function UsersPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <UsersPageClient />
    </Suspense>
  );
}

    