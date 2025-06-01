
'use client';

import type { AuditLogEntry } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area'; // For potentially long details

interface AuditLogTableProps {
  logs: AuditLogEntry[];
}

export function AuditLogTable({ logs }: AuditLogTableProps) {
  if (!logs || logs.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No hay entradas en la bitácora para mostrar.</p>;
  }

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">Fecha y Hora</TableHead>
            <TableHead className="w-[150px]">Actor</TableHead>
            <TableHead className="w-[100px]">Rol</TableHead>
            <TableHead className="w-[200px]">Acción</TableHead>
            <TableHead>Detalles</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id} className="hover:bg-muted/50 transition-colors">
              <TableCell>
                {format(parseISO(log.timestamp), "dd MMM yyyy, HH:mm:ss", { locale: es })}
              </TableCell>
              <TableCell className="font-medium">{log.actorName || 'Desconocido'}</TableCell>
              <TableCell>
                <Badge variant={log.actorRole === 'admin' ? 'default' : 'secondary'}>
                    {log.actorRole ? log.actorRole.charAt(0).toUpperCase() + log.actorRole.slice(1) : 'N/A'}
                </Badge>
              </TableCell>
              <TableCell>{log.actionType}</TableCell>
              <TableCell>
                <ScrollArea className="h-20 text-xs">
                  <pre className="whitespace-pre-wrap break-all">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                </ScrollArea>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
