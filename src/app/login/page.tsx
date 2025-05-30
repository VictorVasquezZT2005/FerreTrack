
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, User as UserIcon, Loader2, Info } from "lucide-react"; // Changed Mail to UserIcon, Added Info
import { useAuth } from "@/contexts/auth-context";
import { loginUserAction } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import React, { useState } from 'react';
import Link from "next/link"; // Keep Link for potential future use like "Forgot Password"

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [nombre, setNombre] = useState(''); // Changed from email to nombre
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    const result = await loginUserAction({ nombre, password }); // Changed from email to nombre

    if (result.success && result.user) {
      login(result.user);
      toast({
        title: "Inicio de Sesión Exitoso",
        description: `Bienvenido de nuevo, ${result.user.nombre}.`,
      });
      router.push('/'); // Redirect to homepage or dashboard
    } else {
      toast({
        title: "Error de Inicio de Sesión",
        description: result.error || "Ocurrió un error desconocido.",
        variant: "destructive",
      });
      if (result.fieldErrors) {
        // Handle specific field errors if necessary, e.g., highlighting fields
        console.error("Field errors:", result.fieldErrors);
      }
    }
    setIsLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)] py-12">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">Iniciar Sesión</CardTitle>
          <CardDescription>Accede a tu panel de FerreTrack.</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre de Usuario</Label> {/* Changed from email */}
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /> {/* Changed Mail to UserIcon */}
                <Input
                  id="nombre" // Changed from email
                  type="text" // Changed from email
                  placeholder="Tu Nombre de Usuario" // Changed placeholder
                  required
                  className="pl-10"
                  value={nombre} // Changed from email
                  onChange={(e) => setNombre(e.target.value)} // Changed from setEmail
                  disabled={isLoading}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  className="pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Iniciar Sesión"}
            </Button>
            <Link href="/about" className="text-sm text-muted-foreground hover:text-primary hover:underline flex items-center justify-center gap-1">
              <Info className="h-4 w-4" /> Acerca de Nosotros
            </Link>
            {/*
            <p className="text-center text-sm text-muted-foreground">
              ¿No tienes una cuenta?{' '}
              <Link href="#" className="text-primary hover:underline">
                Regístrate
              </Link>
            </p>
            */}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
