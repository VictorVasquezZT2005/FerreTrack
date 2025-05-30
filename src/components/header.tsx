
'use client';

import { Hammer, LogOut, UserCircle, LayoutDashboard, Users, Truck, ShoppingCart, Package, History } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggleButton } from './theme-toggle-button';

export default function AppHeader() {
  const { user, logout, isLoading } = useAuth();

  return (
    <header className="bg-card border-b border-border shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-primary hover:opacity-80 transition-opacity">
          <Hammer className="h-7 w-7" />
          <span>FerreTrack</span>
        </Link>
        <div className="flex items-center gap-2">
          <nav className="hidden md:flex items-center gap-1">
            {user && (
              <>
                <Button variant="ghost" asChild className="text-sm">
                  <span>
                    <Link href="/"><LayoutDashboard className="mr-1 h-4 w-4" /> Dashboard</Link>
                  </span>
                </Button>
                <Button variant="ghost" asChild className="text-sm">
                  <span>
                    <Link href="/inventory"><Package className="mr-1 h-4 w-4" /> Inventario</Link>
                  </span>
                </Button>
                 <Button variant="ghost" asChild className="text-sm">
                  <span>
                    <Link href="/customers"><Users className="mr-1 h-4 w-4" /> Clientes</Link>
                  </span>
                </Button>
                {(user.rol === 'admin' || user.rol === 'empleado') && (
                  <>
                    <Button variant="ghost" asChild className="text-sm">
                      <span>
                        <Link href="/sales"><History className="mr-1 h-4 w-4" /> Ventas</Link>
                      </span>
                    </Button>
                  </>
                )}
                {(user.rol === 'admin' || user.rol === 'empleado') && (
                  <Button variant="ghost" asChild className="text-sm">
                    <span>
                      <Link href="/suppliers"><Truck className="mr-1 h-4 w-4" /> Proveedores</Link>
                    </span>
                  </Button>
                )}
                {user.rol === 'admin' && (
                  <Button variant="ghost" asChild className="text-sm">
                    <span>
                      <Link href="/users"><Users className="mr-1 h-4 w-4" /> Usuarios</Link>
                    </span>
                  </Button>
                )}
              </>
            )}
          </nav>

          <ThemeToggleButton />

          {isLoading ? (
            <div className="h-10 w-20 animate-pulse bg-muted rounded-md"></div>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                   <UserCircle className="h-7 w-7 text-primary" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.nombre}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email} ({user.rol})
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {/* Mobile Navigation Links */}
                <div className="md:hidden">
                    <DropdownMenuItem asChild className="cursor-pointer">
                        <span><Link href="/"><LayoutDashboard className="mr-2 h-4 w-4" />Dashboard</Link></span>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer">
                        <span><Link href="/inventory"><Package className="mr-2 h-4 w-4" />Inventario</Link></span>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer">
                        <span><Link href="/customers"><Users className="mr-2 h-4 w-4" />Clientes</Link></span>
                    </DropdownMenuItem>
                    {(user.rol === 'admin' || user.rol === 'empleado') && (
                      <>
                         <DropdownMenuItem asChild className="cursor-pointer">
                            <span><Link href="/sales"><History className="mr-2 h-4 w-4" />Ventas</Link></span>
                        </DropdownMenuItem>
                      </>
                    )}
                     {(user.rol === 'admin' || user.rol === 'empleado') && (
                        <DropdownMenuItem asChild className="cursor-pointer">
                           <span><Link href="/suppliers"><Truck className="mr-2 h-4 w-4" />Proveedores</Link></span>
                        </DropdownMenuItem>
                     )}
                    {user.rol === 'admin' && (
                         <DropdownMenuItem asChild className="cursor-pointer">
                            <span><Link href="/users"><Users className="mr-2 h-4 w-4" />Usuarios</Link></span>
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                </div>
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            null 
          )}
        </div>
      </div>
    </header>
  );
}
