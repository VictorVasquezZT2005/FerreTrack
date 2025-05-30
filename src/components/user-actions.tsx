
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';
import { AddUserDialog } from '@/components/add-user-dialog';
import type { User } from '@/lib/types';

interface UserActionsProps {
  userRole?: User['rol'];
}

export function UserActions({ userRole }: UserActionsProps) {
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const isAdmin = userRole === 'admin';

  return (
    <>
      <div className="mb-6">
        {isAdmin && (
          <Button onClick={() => setIsAddUserDialogOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" /> Añadir Usuario
          </Button>
        )}
      </div>
      {isAdmin && <AddUserDialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen} />}
    </>
  );
}
