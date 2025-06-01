
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { increaseStockByCodeAction } from '@/lib/actions';
import { UpdateStockClientSchema } from '@/lib/form-schemas'; 
import type { UpdateStockFormValues } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context'; // Added useAuth

const formSchema = UpdateStockClientSchema;

interface UpdateStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpdateStockDialog({ open, onOpenChange }: UpdateStockDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth(); // Get user for actorUserId
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UpdateStockFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: '',
      quantityToAdd: '1',
    },
  });

  async function onSubmit(values: UpdateStockFormValues) {
    setIsSubmitting(true);
    if (!user?.id) {
      toast({ title: "Error de autenticación", description: "No se pudo identificar al usuario para la bitácora.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    const result = await increaseStockByCodeAction(values, user.id);
    setIsSubmitting(false);

    if (result.success && result.item) {
      toast({
        title: 'Stock Actualizado',
        description: `Se añadieron ${values.quantityToAdd} unidades al artículo "${result.item.name}" (Código: ${result.item.code}). Nueva cantidad: ${result.item.quantity}.`,
      });
      form.reset();
      onOpenChange(false);
    } else {
      let errorMessage = result.error || "Ocurrió un error desconocido.";
      if (result.fieldErrors) {
        const fieldErrorMessages = Object.entries(result.fieldErrors)
          .map(([field, errors]) => `${field}: ${errors?.join(', ')}`)
          .join('; ');
        errorMessage = `Falló la validación: ${fieldErrorMessages}`;
      } else if (result.error === `No se encontró ningún artículo con el código "${values.code}".`) {
        form.setError('code', {type: 'manual', message: 'Este código no existe en el inventario.'});
        errorMessage = 'Por favor, corrige el error en el campo de código.';
      }
      toast({
        title: 'Error al Actualizar Stock',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-popover">
        <DialogHeader>
          <DialogTitle>Registrar Entrada de Stock por Código</DialogTitle>
          <DialogDescription>
            Introduce el código del artículo existente (formato CC-SS-NNNNN) y la cantidad a añadir a sus existencias actuales.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código del Artículo Existente</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: 01-01-00001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="quantityToAdd"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cantidad a Añadir</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Añadir al Stock
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
