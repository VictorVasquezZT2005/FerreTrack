
'use client';

import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose, // Keep SheetClose import in case needed elsewhere, though not directly used here for the button
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTechnicalMode } from '@/contexts/technical-mode-context';
import { Code2, Trash2, EyeOff } from 'lucide-react';

interface MongoCommandViewerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MongoCommandViewerSheet({ open, onOpenChange }: MongoCommandViewerSheetProps) {
  const { mongoCommands, clearMongoCommands, toggleTechnicalMode } = useTechnicalMode();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[60vh] flex flex-col sm:h-[50vh] md:max-w-3xl md:mx-auto md:right-auto md:left-1/2 md:-translate-x-1/2 md:rounded-t-lg">
        <SheetHeader className="p-4 border-b">
          <div className="flex justify-between items-center"> {/* Container for title and potential actions */}
            <div className="flex items-center gap-2">
                <Code2 className="h-6 w-6 text-primary" />
                <SheetTitle className="text-xl">Visor de Comandos MongoDB (Modo Técnico)</SheetTitle>
            </div>
            {/* The problematic Button wrapping SheetClose has been removed.
                SheetContent will render its own default close button (X icon, top right).
                If a custom-placed close button is strictly needed here later,
                it should be implemented using <SheetClose asChild><Button>...</Button></SheetClose>
                or just a styled <SheetClose> with an icon.
            */}
          </div>
          <SheetDescription>
            Muestra los comandos MongoDB simulados generados por tus acciones en la aplicación.
          </SheetDescription>
        </SheetHeader>
        
        <ScrollArea className="flex-grow p-4 bg-muted/30 custom-scrollbar">
          {mongoCommands.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              No hay comandos para mostrar. Realiza alguna acción en la app (ej: añadir un producto) para ver los comandos aquí.
            </p>
          ) : (
            <pre className="text-xs whitespace-pre-wrap break-all">
              {mongoCommands.map((cmd, index) => (
                <div key={index} className={`py-1.5 ${index < mongoCommands.length -1 ? 'border-b border-border/50' : ''}`}>
                  {cmd}
                </div>
              ))}
            </pre>
          )}
        </ScrollArea>

        <SheetFooter className="p-4 border-t flex flex-col sm:flex-row justify-between items-center gap-2">
            <Button variant="outline" onClick={toggleTechnicalMode} className="w-full sm:w-auto">
              <EyeOff className="mr-2 h-4 w-4" />
              Desactivar Modo Técnico
            </Button>
            <Button variant="destructive" onClick={clearMongoCommands} disabled={mongoCommands.length === 0} className="w-full sm:w-auto">
              <Trash2 className="mr-2 h-4 w-4" />
              Limpiar Comandos
            </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
