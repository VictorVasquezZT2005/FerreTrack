
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getAppGuideExplanation } from '@/ai/flows/app-guide-flow'; // Asegúrate que la ruta sea correcta
import type { AppGuideInput } from '@/ai/flows/app-guide-flow';

interface AiGuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const tourTopics = [
  { id: 'dashboard', label: 'Explicar el Dashboard' },
  { id: 'inventory', label: 'Entender el Inventario' },
  { id: 'add_inventory', label: 'Cómo añadir un artículo al inventario' },
  { id: 'update_stock', label: 'Cómo registrar entrada de stock' },
  { id: 'sales', label: 'Entender las Ventas' },
  { id: 'create_sale', label: 'Cómo registrar una venta' },
  { id: 'customers', label: 'Entender los Clientes' },
  { id: 'suppliers', label: 'Entender los Proveedores' },
];

export function AiGuideDialog({ open, onOpenChange }: AiGuideDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const handleFetchExplanation = async (topic: string, label: string) => {
    setIsLoading(true);
    setError(null);
    setExplanation(null);
    setSelectedTopic(label);

    try {
      const input: AppGuideInput = { topic };
      const result = await getAppGuideExplanation(input);
      setExplanation(result.explanation);
    } catch (err: any) {
      console.error("Error fetching AI explanation:", err);
      setError(err.message || "No se pudo obtener la explicación de la IA.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state when dialog closes
    setTimeout(() => {
        setIsLoading(false);
        setExplanation(null);
        setError(null);
        setSelectedTopic(null);
    }, 300); // Delay to allow closing animation
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg md:max-w-xl bg-popover min-h-[300px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-6 w-6 text-primary" />
            Guía IA de FerreTrack
          </DialogTitle>
          <DialogDescription>
            Selecciona un tema para obtener una explicación generada por IA o haz una pregunta (próximamente).
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
          {!explanation && !isLoading && !error && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
              {tourTopics.map((topic) => (
                <Button
                  key={topic.id}
                  variant="outline"
                  onClick={() => handleFetchExplanation(topic.id, topic.label)}
                  className="justify-start text-left h-auto py-2"
                >
                  {topic.label}
                </Button>
              ))}
            </div>
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center h-full py-8">
              <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Consultando a FerreHelper...</p>
              {selectedTopic && <p className="text-sm text-muted-foreground mt-1">Explicando: {selectedTopic}</p>}
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center h-full py-8 text-center">
              <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
              <p className="text-destructive font-semibold">Error al obtener la explicación</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
              <Button variant="outline" onClick={() => { setError(null); setIsLoading(false); setExplanation(null); setSelectedTopic(null); }} className="mt-4">
                Volver a intentar
              </Button>
            </div>
          )}

          {explanation && !isLoading && (
            <ScrollArea className="h-[calc(80vh-220px)] sm:h-auto sm:max-h-[calc(80vh-220px)] mt-2">
              <div className="prose prose-sm dark:prose-invert max-w-none p-4 bg-muted/50 rounded-md">
                 {selectedTopic && <h3 className="text-lg font-semibold mb-2 text-primary">{selectedTopic}</h3>}
                {explanation.split('\n').map((paragraph, index) => (
                  <p key={index} className="mb-2">{paragraph}</p>
                ))}
              </div>
               <Button variant="link" onClick={() => { setExplanation(null); setSelectedTopic(null); }} className="mt-3 text-sm">
                &larr; Ver otros temas
              </Button>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="mt-auto pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
