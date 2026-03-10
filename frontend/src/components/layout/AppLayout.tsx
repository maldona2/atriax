import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

const navItems = [
  { to: '/app/appointments', label: 'Turnos' },
  { to: '/app/patients', label: 'Pacientes' },
];

export function AppLayout() {
  const { logout } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-4 py-3 flex items-center justify-between">
        <nav className="flex gap-4">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`font-medium ${
                location.pathname.startsWith(item.to)
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
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
