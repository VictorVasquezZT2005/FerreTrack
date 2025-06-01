
'use client';

import { AuditLogTable } from '../../components/audit-log-table';
import { fetchAuditLogsAction } from '@/lib/actions';
import type { AuditLogEntry } from '@/lib/types';
import React, { useEffect, useState, Suspense } from 'react';
import PageLoading from '@/app/loading'; // General loading
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';


function AuditLogPageClient() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user?.rol !== 'admin') {
      router.push('/'); // Redirect non-admins
      return;
    }

    if (user?.rol === 'admin') {
      async function loadLogs() {
        setIsLoading(true);
        setError(null); // Clear previous error
        try {
          const result = await fetchAuditLogsAction();
          if (result.success && result.logs) {
            setLogs(result.logs);
          } else {
            console.error("Error al obtener la bitácora desde la acción:", result.error);
            setError(result.error || "No se pudo cargar la bitácora. Inténtalo de nuevo más tarde.");
            setLogs([]); // Clear logs on error
          }
        } catch (err: any) {
            // This catch block might be redundant if fetchAuditLogsAction handles all its errors
            console.error("Excepción al llamar a fetchAuditLogsAction:", err);
            setError("Ocurrió una excepción al cargar la bitácora.");
            setLogs([]);
        }
        setIsLoading(false);
      }
      loadLogs();
    }
  }, [user, authLoading, router]);

  if (authLoading || (user?.rol === 'admin' && isLoading)) {
    return <PageLoading />;
  }

  if (user?.rol !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Alert variant="destructive" className="max-w-md">
          <ShieldAlert className="h-4 w-4" />
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
        <Card className="shadow-lg">
            <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                    <History className="h-8 w-8 text-primary" />
                    <div>
                        <CardTitle className="text-3xl font-bold">Bitácora de Auditoría</CardTitle>
                        <CardDescription>Registro de todas las acciones importantes realizadas en el sistema.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {error && (
                    <Alert variant="destructive" className="mb-4">
                        <ShieldAlert className="h-4 w-4" />
                        <AlertTitle>Error al Cargar Bitácora</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                <AuditLogTable logs={logs} />
            </CardContent>
        </Card>
    </div>
  );
}

export default function AuditLogPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AuditLogPageClient />
    </Suspense>
  );
}

