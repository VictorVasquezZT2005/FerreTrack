
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SimulatedCardPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
  onPaymentSuccess: () => void;
}

export function SimulatedCardPaymentDialog({
  open,
  onOpenChange,
  totalAmount,
  onPaymentSuccess,
}: SimulatedCardPaymentDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Simple state for simulated card inputs - not using react-hook-form as data isn't persisted
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');

  const handleProcessPayment = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsLoading(false);
    toast({
      title: 'Pago Simulado Exitoso',
      description: 'El pago con tarjeta ha sido "procesado".',
    });
    onPaymentSuccess();
    onOpenChange(false); // Close the dialog
  };

  const handleCloseDialog = () => {
    if (!isLoading) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleCloseDialog}>
      <DialogContent className="sm:max-w-md bg-popover">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-primary" />
            Procesar Pago con Tarjeta (Simulación)
          </DialogTitle>
          <DialogDescription>
            Ingrese los detalles de la tarjeta para simular el pago. Estos datos no se guardarán.
            Monto a Pagar: <span className="font-bold text-primary">${totalAmount.toFixed(2)}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-3">
          <div className="space-y-1">
            <Label htmlFor="cardholderName">Nombre del Titular</Label>
            <Input
              id="cardholderName"
              placeholder="Ej: Juan Pérez"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cardNumber">Número de Tarjeta</Label>
            <Input
              id="cardNumber"
              placeholder="xxxx xxxx xxxx xxxx"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="expiryDate">Fecha de Vencimiento</Label>
              <Input
                id="expiryDate"
                placeholder="MM/AA"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cvv">CVV</Label>
              <Input
                id="cvv"
                placeholder="123"
                value={cvv}
                onChange={(e) => setCvv(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
          <Button type="button" variant="outline" onClick={handleCloseDialog} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleProcessPayment} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="mr-2 h-4 w-4" />
            )}
            Procesar Pago
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
