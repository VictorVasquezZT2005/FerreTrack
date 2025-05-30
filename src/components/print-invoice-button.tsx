
'use client';

import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

export function PrintInvoiceButton() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <Button onClick={handlePrint} variant="outline" size="lg">
      <Printer className="mr-2 h-5 w-5" />
      Imprimir Factura
    </Button>
  );
}
