
'use client';

import { Hammer, LogOut, UserCircle, LayoutDashboard, Users, Truck, ShoppingCart, Package, History, BarChart3, Terminal, Eye, EyeOff } from 'lucide-react'; 
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
import { useTechnicalMode } from '@/contexts/technical-mode-context'; // Import useTechnicalMode
import { MongoCommandViewerSheet } from './mongo-command-viewer-sheet'; // Import the sheet
import React, { useState } from 'react'; // Import useState for sheet visibility

export default function AppHeader() {
  const { user, logout, isLoading } = useAuth();
  const { isTechnicalModeActive, toggleTechnicalMode } = useTechnicalMode();
  const [isCommandSheetOpen, setIsCommandSheetOpen] = useState(false);

  const canViewCustomers = user?.rol === 'admin' || user?.rol === 'empleado';
  const canViewSales = user?.rol === 'admin' || user?.rol === 'empleado';
  const canViewSuppliers = user?.rol === 'admin' || user?.rol === 'empleado' || user?.rol === 'inventory_manager';
  const canViewSystemUsers = user?.rol === 'admin';
  const canViewAuditLog = user?.rol === 'admin';
  const canViewInventory = user?.rol === 'admin' || user?.rol === 'empleado' || user?.rol === 'inventory_manager';
  const canViewReports = user?.rol === 'admin'; 


  const handleToggleTechnicalModeAndSheet = () => {
    const newModeState = !isTechnicalModeActive;
    toggleTechnicalMode(); // This will update context and localStorage
    if (newModeState) {
      setIsCommandSheetOpen(true); // Open sheet if mode is activated
    } else {
      setIsCommandSheetOpen(false); // Close sheet if mode is deactivated
    }
  };
  
  // Ensure sheet opens if mode is active (e.g. on page load from localStorage)
  React.useEffect(() => {
    if (isTechnicalModeActive && !isCommandSheetOpen) {
        // setIsCommandSheetOpen(true); // Potentially open if mode is active but sheet isn't
        // This might be too aggressive, let user open it manually after mode is active.
    } else if (!isTechnicalModeActive && isCommandSheetOpen) {
        setIsCommandSheetOpen(false); // Close sheet if mode becomes inactive
    }
  }, [isTechnicalModeActive, isCommandSheetOpen]);


  return (
    <>
    <header className="bg-card border-b border-border shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-primary hover:opacity-80 transition-opacity">
          <Hammer className="h-7 w-7" />
          <span>FerreTrack</span>
        </Link>
        <div className="flex items-center gap-1.5"> {/* Reduced gap a bit */}
          <nav className="hidden md:flex items-center gap-1">
            {user && (
              <>
                <Button variant="ghost" asChild className="text-sm">
                  <span>
                    <Link href="/"><LayoutDashboard className="mr-1 h-4 w-4" /> Dashboard</Link>
                  </span>
                </Button>
                {canViewInventory && (
                  <Button variant="ghost" asChild className="text-sm">
                    <span>
                      <Link href="/inventory"><Package className="mr-1 h-4 w-4" /> Inventario</Link>
                    </span>
                  </Button>
                )}
                 {canViewCustomers && (
                  <Button variant="ghost" asChild className="text-sm">
                    <span>
                      <Link href="/customers"><Users className="mr-1 h-4 w-4" /> Clientes</Link>
                    </span>
                  </Button>
                )}
                {canViewSales && (
                  <>
                    <Button variant="ghost" asChild className="text-sm">
                      <span>
                        <Link href="/sales"><History className="mr-1 h-4 w-4" /> Ventas</Link>
                      </span>
                    </Button>
                  </>
                )}
                {canViewSuppliers && (
                  <Button variant="ghost" asChild className="text-sm">
                    <span>
                      <Link href="/suppliers"><Truck className="mr-1 h-4 w-4" /> Proveedores</Link>
                    </span>
                  </Button>
                )}
                {canViewSystemUsers && (
                  <Button variant="ghost" asChild className="text-sm">
                    <span>
                      <Link href="/users"><Users className="mr-1 h-4 w-4" /> Usuarios</Link>
                    </span>
                  </Button>
                )}
                {canViewAuditLog && (
                  <Button variant="ghost" asChild className="text-sm">
                    <span>
                      <Link href="/audit-log"><History className="mr-1 h-4 w-4" /> Bitácora</Link>
                    </span>
                  </Button>
                )}
                {canViewReports && (
                   <Button variant="ghost" asChild className="text-sm">
                    <span>
                      <Link href="/admin/reports/sales-by-month"><BarChart3 className="mr-1 h-4 w-4" /> Reportes</Link>
                    </span>
                  </Button>
                )}
              </>
            )}
          </nav>

          <ThemeToggleButton />

          {user && ( // Only show technical mode toggle if user is logged in
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleTechnicalModeAndSheet}
              aria-label={isTechnicalModeActive ? "Desactivar Modo Técnico y Ocultar Comandos" : "Activar Modo Técnico y Ver Comandos"}
              title={isTechnicalModeActive ? "Modo Técnico: ON" : "Modo Técnico: OFF"}
              className={isTechnicalModeActive ? 'text-primary ring-1 ring-primary' : ''}
            >
              {isTechnicalModeActive ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5 text-muted-foreground" />}
            </Button>
          )}


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
                    {canViewInventory && (
                      <DropdownMenuItem asChild className="cursor-pointer">
                          <span><Link href="/inventory"><Package className="mr-2 h-4 w-4" />Inventario</Link></span>
                      </DropdownMenuItem>
                    )}
                    {canViewCustomers && (
                      <DropdownMenuItem asChild className="cursor-pointer">
                          <span><Link href="/customers"><Users className="mr-2 h-4 w-4" />Clientes</Link></span>
                      </DropdownMenuItem>
                    )}
                    {canViewSales && (
                      <>
                         <DropdownMenuItem asChild className="cursor-pointer">
                            <span><Link href="/sales"><History className="mr-2 h-4 w-4" />Ventas</Link></span>
                        </DropdownMenuItem>
                      </>
                    )}
                     {canViewSuppliers && (
                        <DropdownMenuItem asChild className="cursor-pointer">
                           <span><Link href="/suppliers"><Truck className="mr-2 h-4 w-4" />Proveedores</Link></span>
                        </DropdownMenuItem>
                     )}
                    {canViewSystemUsers && (
                         <DropdownMenuItem asChild className="cursor-pointer">
                            <span><Link href="/users"><Users className="mr-2 h-4 w-4" />Usuarios</Link></span>
                        </DropdownMenuItem>
                    )}
                    {canViewAuditLog && (
                         <DropdownMenuItem asChild className="cursor-pointer">
                            <span><Link href="/audit-log"><History className="mr-2 h-4 w-4" />Bitácora</Link></span>
                        </DropdownMenuItem>
                    )}
                    {canViewReports && (
                         <DropdownMenuItem asChild className="cursor-pointer">
                            <span><Link href="/admin/reports/sales-by-month"><BarChart3 className="mr-2 h-4 w-4" />Reportes</Link></span>
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
    {isTechnicalModeActive && user && ( /* Ensure user is logged in to see the sheet */
        <MongoCommandViewerSheet 
            open={isCommandSheetOpen} 
            onOpenChange={(open) => {
                setIsCommandSheetOpen(open);
                if (!open && isTechnicalModeActive) {
                    // If user closes sheet manually, but mode is still active,
                    // we don't deactivate the mode. User might want to reopen.
                } else if (!open && !isTechnicalModeActive) {
                    // If sheet is closed AND mode is inactive, ensure consistent state.
                    // This scenario is less likely with current toggle logic.
                }
            }}
        />
    )}
    </>
  );
}
