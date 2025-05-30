
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

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
          <CardDescription>Conoce al equipo detrás del proyecto.</CardDescription>
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
          <div className="text-center mt-8">
            <Button asChild variant="outline">
              <Link href="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al Login
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
