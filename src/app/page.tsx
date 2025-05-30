
'use client';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Package, Users, Truck, History } from 'lucide-react';
import Link from 'next/link';
// Image import removed

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      <div className="p-6 rounded-lg shadow-md bg-card">
        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* Image component and its container div removed */}
          <div>
            <h1 className="text-4xl font-bold text-primary">¡Bienvenido a FerreTrack, {user?.nombre}!</h1>
            <p className="text-lg text-muted-foreground mt-2">
              Tu panel de control central para una gestión eficiente de tu ferretería.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <DashboardCard
          title="Inventario"
          description="Gestiona tus productos y existencias."
          icon={<Package className="h-8 w-8 text-primary" />}
          href="/inventory"
          userRole={user?.rol}
          allowedRoles={['admin', 'empleado']}
        />
        <DashboardCard
          title="Clientes"
          description="Administra la información de tus clientes."
          icon={<Users className="h-8 w-8 text-primary" />}
          href="/customers"
          userRole={user?.rol}
          allowedRoles={['admin', 'empleado']}
        />
        <DashboardCard
          title="Ventas"
          description="Consulta el registro de todas las ventas."
          icon={<History className="h-8 w-8 text-primary" />}
          href="/sales"
          userRole={user?.rol}
          allowedRoles={['admin', 'empleado']}
        />
        <DashboardCard
          title="Proveedores"
          description="Administra la información de tus proveedores."
          icon={<Truck className="h-8 w-8 text-primary" />}
          href="/suppliers"
          userRole={user?.rol}
          allowedRoles={['admin', 'empleado']}
        />
        {user?.rol === 'admin' && (
          <DashboardCard
            title="Usuarios"
            description="Gestiona los usuarios del sistema."
            icon={<Users className="h-8 w-8 text-primary" />} // Re-using Users icon for system users
            href="/users"
            userRole={user?.rol}
            allowedRoles={['admin']}
          />
        )}
      </div>

      {/*
      <Card>
        <CardHeader>
          <CardTitle>Actividad Reciente</CardTitle>
          <CardDescription>Últimos movimientos en el sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Próximamente...</p>
        </CardContent>
      </Card>
      */}
    </div>
  );
}

interface DashboardCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  userRole?: 'admin' | 'empleado';
  allowedRoles: Array<'admin' | 'empleado'>;
}

function DashboardCard({ title, description, icon, href, userRole, allowedRoles }: DashboardCardProps) {
  if (!userRole || !allowedRoles.includes(userRole)) {
    return null;
  }
  return (
    <Link href={href} passHref>
      <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer h-full flex flex-col group transform hover:scale-105 bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-semibold group-hover:text-primary transition-colors">{title}</CardTitle>
          {icon}
        </CardHeader>
        <CardContent className="flex-grow">
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
        <CardFooter className="pt-4">
            <Button variant="ghost" className="w-full justify-start text-primary group-hover:underline">
                Ir a {title} &rarr;
            </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}
