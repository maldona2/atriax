import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from '@/components/ui/field';
import logoAtriax from '@/assets/images/logo_sin_fondo3.svg';
import { AtriaxLogo } from '@/components/landing';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from
    ?.pathname;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      const target =
        from && from !== '/login' && from.startsWith('/')
          ? from
          : user.role === 'super_admin'
            ? '/admin/tenants'
            : '/app/appointments';
      navigate(target, { replace: true });
    } catch (err: unknown) {
      const data =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        err.response &&
        typeof err.response === 'object' &&
        'data' in err.response
          ? (err.response as { data?: { error?: { message?: string } } }).data
          : null;
      setError(data?.error?.message || 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4 py-12">
      <div className="mb-8 flex flex-col items-center gap-2">
        <AtriaxLogo />
        <span className="text-lg font-semibold tracking-tight text-foreground">
          Atriax
        </span>
      </div>

      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Iniciar sesión</CardTitle>
          <CardDescription className="text-balance">
            Panel de administración para profesionales de salud estética
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doctor@clinica.com"
                  required
                  autoComplete="email"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="password">Contraseña</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <div className="text-right">
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium underline text-muted-foreground"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
              </Field>

              {error && <FieldError>{error}</FieldError>}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        ¿Aún no tienes cuenta?{' '}
        <Link to="/register" className="font-medium underline">
          Crea una cuenta gratis
        </Link>
      </p>
    </div>
  );
}
