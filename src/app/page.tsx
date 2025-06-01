
'use client';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Package, Users, Truck, History as SalesHistoryIcon, Edit3, ShieldCheck } from 'lucide-react'; // Renamed History to SalesHistoryIcon
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      <div className="p-6 rounded-lg shadow-md bg-card">
        <div className="flex flex-col md:flex-row items-center gap-6">
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
          allowedRoles={['admin', 'empleado', 'inventory_manager']}
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
          icon={<SalesHistoryIcon className="h-8 w-8 text-primary" />}
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
          allowedRoles={['admin', 'empleado', 'inventory_manager']}
        />
        <DashboardCard
          title="Usuarios del Sistema"
          description="Gestiona los usuarios del sistema."
          icon={<Users className="h-8 w-8 text-primary" />}
          href="/users"
          userRole={user?.rol}
          allowedRoles={['admin']}
        />
        <DashboardCard
          title="Bitácora de Auditoría"
          description="Revisa los registros de actividad del sistema."
          icon={<ShieldCheck className="h-8 w-8 text-primary" />}
          href="/audit-log"
          userRole={user?.rol}
          allowedRoles={['admin']}
        />
      </div>
    </div>
  );
}

interface DashboardCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  userRole?: 'admin' | 'empleado' | 'inventory_manager';
  allowedRoles: Array<'admin' | 'empleado' | 'inventory_manager'>;
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
