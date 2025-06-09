
'use client';

import type { AnalyzeInventoryTrendsOutput } from '@/ai/flows/analyze-inventory-trends';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, TrendingUp } from 'lucide-react';

interface TrendAnalysisCardProps {
  analysisResult: AnalyzeInventoryTrendsOutput | null;
}

export function TrendAnalysisCard({ analysisResult }: TrendAnalysisCardProps) {
  if (!analysisResult) {
    return null;
  }

  return (
    <Card className="mt-8 shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          <CardTitle className="text-2xl">Análisis de Tendencias de Inventario</CardTitle>
        </div>
        <CardDescription>Información impulsada por IA sobre tus niveles de inventario y posibles desabastecimientos.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2 text-foreground">Resumen General</h3>
            <p className="text-sm text-muted-foreground bg-secondary p-3 rounded-md">{analysisResult.summary}</p>
          </div>

          {analysisResult.stockoutPredictions && analysisResult.stockoutPredictions.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 text-foreground">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Posibles Desabastecimientos y Recomendaciones
              </h3>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Artículo</TableHead>
                      <TableHead className="text-center">Días Hasta Desabastecimiento</TableHead>
                      <TableHead className="text-right">Cant. Pedido Recomendada</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analysisResult.stockoutPredictions.map((prediction, index) => (
                      <TableRow key={`${prediction.item}-${index}`}>
                        <TableCell className="font-medium">{prediction.item}</TableCell>
                        <TableCell className={`text-center font-semibold ${prediction.daysUntilStockout <= 7 ? 'text-destructive' : 'text-foreground'}`}>
                          {prediction.daysUntilStockout}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-primary">
                          {prediction.recommendedOrderQuantity}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          {analysisResult.stockoutPredictions && analysisResult.stockoutPredictions.length === 0 && (
             <p className="text-sm text-muted-foreground">No se identificaron riesgos inmediatos de desabastecimiento basados en las existencias mínimas. ¡Bien hecho!</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

