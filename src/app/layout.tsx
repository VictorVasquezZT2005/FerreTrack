
'use client'; // Required for AuthProvider and AuthGuard to work

import type { Metadata } from 'next'; // Still can use Metadata type
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import AppHeader from '@/components/header';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { ThemeProvider } from '@/contexts/theme-provider'; // Importar ThemeProvider
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect } from 'react';
import PageLoading from './loading'; // General loading for auth check

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user && pathname !== '/login' && pathname !== '/about') {
      router.push('/login');
    }
  }, [isLoading, user, pathname, router]);

  if (isLoading) {
    return (
       <div className="flex flex-col min-h-screen">
         <header className="bg-card border-b border-border shadow-sm sticky top-0 z-40">
            <div className="container mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-2xl font-bold text-primary">
                <span>FerreTrack</span>
              </div>
            </div>
         </header>
         <main className="flex-grow container mx-auto px-4 py-8">
          <PageLoading />
         </main>
         <footer className="py-4 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} FerreTrack. Todos los derechos reservados.
          </footer>
       </div>
    );
  }

  if (!user && pathname !== '/login' && pathname !== '/about') {
    // This check is mostly redundant due to the useEffect but can prevent a flash
    return null;
  }

  return <>{children}</>;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  useEffect(() => {
    document.title = 'FerreTrack - Gestión de Inventario';
  }, []);

  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`}>
        <ThemeProvider
          defaultTheme="light"
          storageKey="ferretrack-ui-theme"
        >
          <AuthProvider>
            <AuthGuard>
              <div className="flex flex-col min-h-screen">
                <AppHeader />
                <main className="flex-grow container mx-auto px-4 py-8">
                  {children}
                </main>
                <footer className="py-4 text-center text-sm text-muted-foreground">
                  © {new Date().getFullYear()} FerreTrack. Todos los derechos reservados.
                </footer>
              </div>
              <Toaster />
            </AuthGuard>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
