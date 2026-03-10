import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

export function AdminLayout() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-4 py-3 flex items-center justify-between">
        <Link to="/admin/tenants" className="font-semibold">
          Panel Admin — Profesionales
        </Link>
        <Button variant="outline" size="sm" onClick={logout}>
          Cerrar sesión
        </Button>
      </header>
      <main className="p-4">
        <Outlet />
      </main>
    </div>
  );
}
