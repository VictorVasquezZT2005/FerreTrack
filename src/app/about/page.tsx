
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Database, GitBranch } from "lucide-react"; // Added Database, GitBranch

export default function AboutPage() {
  const creators = [
    { name: "Alejandro Segobia", role: "Tester" },
    { name: "Brayan Campos", role: "Tester" },
    { name: "Elian Argueta", role: "Interfaz" },
    { name: "Josue Vasquez", role: "Tester" },
    { name: "Luisa Ramos", role: "Interfaz" },
    { name: "Victor Vasques", role: "Lógica" },
  ].sort((a, b) => a.name.localeCompare(b.name)); // Ensure alphabetical order by name

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] py-12 px-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">Acerca de FerreTrack</CardTitle>
          <CardDescription>Conoce al equipo detrás del proyecto y algunos detalles técnicos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-center">Equipo de Desarrollo</h3>
            <ul className="space-y-3">
              {creators.map((creator) => (
                <li key={creator.name} className="p-3 bg-muted/50 rounded-md shadow-sm">
                  <p className="font-medium text-lg text-foreground">{creator.name}</p>
                  <p className="text-sm text-muted-foreground">{creator.role}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-xl font-semibold text-center">Información Técnica</h3>
            <div className="p-4 bg-secondary/30 rounded-md shadow-sm space-y-3">
              <div className="flex items-start gap-3">
                <Database className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-lg">Base de Datos MongoDB</h4>
                  <p className="text-sm text-muted-foreground">
                    FerreTrack utiliza MongoDB como su sistema de base de datos NoSQL. 
                    Esto nos permite una gran flexibilidad en el manejo de datos de productos, ventas y clientes.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <GitBranch className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-lg">Alta Disponibilidad y Replicación</h4>
                  <p className="text-sm text-muted-foreground">
                    Nuestra instancia de MongoDB (alojada en MongoDB Atlas) está configurada con un <strong className="text-foreground">Replica Set</strong>. 
                    Esto significa que los datos se copian automáticamente a múltiples servidores (nodos). Si el servidor principal (Primary) falla, 
                    uno de los servidores de respaldo (Secondary) toma su lugar automáticamente (failover). Esto asegura que FerreTrack
                    siga funcionando y tus datos estén protegidos.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </CardContent>
         <CardFooter className="flex flex-col items-center text-center mt-2 border-t pt-6">
            <p className="text-xs text-muted-foreground mb-4">
                Para administradores: Explora el <Link href="/admin/reports/sales-by-month" className="text-primary hover:underline">Reporte de Ventas por Mes</Link> para ver un ejemplo de agregaciones.
            </p>
            <Button asChild variant="outline">
              <Link href="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al Login
              </Link>
            </Button>
          </CardFooter>
      </Card>
    </div>
  );
}

    