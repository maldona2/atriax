import * as React from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { ChevronLeft, LogOut, Menu, User } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import logoAtriax from '@/assets/images/logo_sin_fondo3.svg';
import { AtriaxLogo } from '../landing';

interface SidebarItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

interface DashboardShellProps {
  sidebarItems: readonly SidebarItem[];
  onLogout: () => void;
  userEmail?: string | null;
  userName?: string | null;
  children: React.ReactNode;
}

function Logo({
  collapsed,
  userName,
  href,
}: {
  collapsed: boolean;
  userName?: string | null;
  href: string;
}) {
  const firstName = userName?.split(' ')[0] ?? null;

  return (
    <Link to={href} className="flex items-center gap-2 px-2">
      <AtriaxLogo />
      {!collapsed && (
        <div className="min-w-0">
          <span className="block truncate font-semibold text-foreground">
            Atriax
          </span>
          {firstName && (
            <span className="block truncate text-xs text-muted-foreground">
              Hola, {firstName}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}

function NavItem({
  item,
  isActive,
  collapsed,
  onClick,
}: {
  item: SidebarItem;
  isActive: boolean;
  collapsed: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;

  return (
    <Link
      to={item.to}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
    >
      <Icon className="size-5 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}

function SidebarNav({
  items,
  collapsed,
  onItemClick,
}: {
  items: readonly SidebarItem[];
  collapsed: boolean;
  onItemClick?: () => void;
}) {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  function isItemActive(to: string) {
    const qIndex = to.indexOf('?');
    if (qIndex !== -1) {
      const toPathname = to.slice(0, qIndex);
      const toSearch = new URLSearchParams(to.slice(qIndex + 1));
      if (location.pathname !== toPathname) return false;
      for (const [key, value] of toSearch.entries()) {
        if (searchParams.get(key) !== value) return false;
      }
      return true;
    }
    return (
      location.pathname === to ||
      (to !== '/' && location.pathname.startsWith(to + '/'))
    );
  }

  return (
    <nav className="flex flex-col gap-1 px-2">
      {items.map((item) => (
        <NavItem
          key={item.to}
          item={item}
          isActive={isItemActive(item.to)}
          collapsed={collapsed}
          onClick={onItemClick}
        />
      ))}
    </nav>
  );
}

function UserMenu({
  onLogout,
  userEmail,
  userName,
}: {
  onLogout: () => void;
  userEmail?: string | null;
  userName?: string | null;
}) {
  const initials = userName
    ? userName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : (userEmail?.[0]?.toUpperCase() ?? 'U');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative size-9 rounded-full">
          <Avatar className="size-9">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {(userName || userEmail) && (
          <>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-1">
                {userName && (
                  <p className="text-sm font-medium leading-none">{userName}</p>
                )}
                {userEmail && (
                  <p className="text-xs text-muted-foreground">{userEmail}</p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem asChild>
          <Link to="/app/profile">
            <User className="size-4" />
            Mi perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout} variant="destructive">
          <LogOut className="size-4" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DashboardShell({
  sidebarItems,
  onLogout,
  userEmail,
  userName,
  children,
}: DashboardShellProps) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 hidden flex-col border-r bg-background transition-all duration-300 md:flex',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        <div
          className={cn(
            'flex h-16 items-center border-b px-4',
            collapsed ? 'justify-center' : 'justify-between'
          )}
        >
          <Logo
            collapsed={collapsed}
            userName={userName}
            href={sidebarItems[0]?.to ?? '/'}
          />
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setCollapsed(true)}
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="size-4" />
            </Button>
          )}
        </div>

        {collapsed && (
          <div className="flex justify-center py-2">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setCollapsed(false)}
              aria-label="Expand sidebar"
            >
              <Menu className="size-4" />
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-4">
          <SidebarNav items={sidebarItems} collapsed={collapsed} />
        </div>

        <Separator />

        <div className="p-4">
          <Button
            variant="ghost"
            className={cn(
              'w-full justify-start gap-3 text-muted-foreground hover:text-destructive',
              collapsed && 'justify-center px-0'
            )}
            onClick={onLogout}
          >
            <LogOut className="size-5" />
            {!collapsed && <span>Cerrar sesión</span>}
          </Button>
        </div>
      </aside>

      {/* Mobile Sidebar Sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="border-b px-4 py-4">
            <SheetTitle asChild>
              <Logo
                collapsed={false}
                userName={userName}
                href={sidebarItems[0]?.to ?? '/'}
              />
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto py-4">
            <SidebarNav
              items={sidebarItems}
              collapsed={false}
              onItemClick={() => setMobileOpen(false)}
            />
          </div>

          <Separator />

          <div className="p-4">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
              onClick={() => {
                onLogout();
                setMobileOpen(false);
              }}
            >
              <LogOut className="size-5" />
              <span>Cerrar sesión</span>
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div
        className={cn(
          'flex flex-1 flex-col transition-all duration-300',
          collapsed ? 'md:pl-16' : 'md:pl-64'
        )}
      >
        {/* Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
          <div className="flex items-center gap-4">
            {/* Mobile hamburger */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </Button>
          </div>

          <UserMenu
            onLogout={onLogout}
            userEmail={userEmail}
            userName={userName}
          />
        </header>

        {/* Main scrollable content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
