import { Link } from 'react-router-dom';
import { LogOut, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { AtriaxLogo } from './AtriaxLogo';

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
  return email?.[0]?.toUpperCase() ?? 'U';
}

function getDashboardHref(role: string): string {
  return role === 'super_admin' ? '/admin/tenants' : '/app/appointments';
}

export function LandingHeader() {
  const { user, isLoading, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <AtriaxLogo />
            <span className="text-xl font-semibold text-foreground">
              Atriax
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#beneficios"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Beneficios
            </a>
            <a
              href="#funcionalidades"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Funcionalidades
            </a>
            <a
              href="#precios"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Precios
            </a>
            <a
              href="#faq"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              FAQ
            </a>
          </nav>

          {/* CTA area — auth-aware */}
          <div className="flex items-center gap-3">
            {isLoading ? (
              /* Skeleton placeholders to prevent CTA flash while auth resolves */
              <>
                <div className="hidden sm:block h-8 w-28 rounded-md bg-muted animate-pulse" />
                <div className="h-8 w-24 rounded-md bg-muted animate-pulse" />
              </>
            ) : user ? (
              /* Authenticated: show dashboard shortcut + user menu */
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden sm:inline-flex gap-2"
                  asChild
                >
                  <Link to={getDashboardHref(user.role)}>
                    <LayoutDashboard className="size-4" />
                    Ir al panel
                  </Link>
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative size-9 rounded-full"
                    >
                      <Avatar className="size-9">
                        <AvatarFallback>
                          {getInitials(user.fullName, user.email)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col gap-1">
                        {user.fullName && (
                          <p className="text-sm font-medium leading-none">
                            {user.fullName}
                          </p>
                        )}
                        {user.email && (
                          <p className="text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        )}
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to={getDashboardHref(user.role)}>
                        <LayoutDashboard className="size-4" />
                        Ir al panel
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} variant="destructive">
                      <LogOut className="size-4" />
                      Cerrar sesión
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              /* Not authenticated: original login + register buttons */
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden sm:inline-flex"
                  asChild
                >
                  <Link to="/login">Iniciar sesión</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/register">Prueba gratis</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
