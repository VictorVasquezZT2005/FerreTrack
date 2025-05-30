
'use client';

import { UserActions } from '@/components/user-actions';
import { UsersTable } from '@/components/users-table';
import { fetchUsersAction } from '@/lib/actions';
import type { User } from '@/lib/types';
import React, { useEffect, useState, Suspense } from 'react';
import PageLoading from '@/app/loading';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation'; // Import useRouter for redirection
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

function UsersPageClient() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && currentUser?.rol !== 'admin') {
      router.push('/'); // Redirect non-admins to dashboard
      return;
    }

    if (currentUser?.rol === 'admin') {
      async function loadUsers() {
        setIsLoading(true);
        try {
          const fetchedUsers = await fetchUsersAction();
          setUsers(fetchedUsers);
        } catch (error) {
          console.error("Error al obtener usuarios:", error);
        }
        setIsLoading(false);
      }
      loadUsers();
    }
  }, [currentUser, authLoading, router]);

  if (authLoading || (currentUser?.rol === 'admin' && isLoading)) {
    return <PageLoading />;
  }

  if (currentUser?.rol !== 'admin') {
    // This case should ideally be handled by the redirect, but as a fallback:
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
      <UserActions userRole={currentUser?.rol} />
      <UsersTable users={users} userRole={currentUser?.rol} />
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
