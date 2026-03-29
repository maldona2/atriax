import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '@/lib/api';
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
import { AtriaxLogo } from '@/components/landing';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [tokenError, setTokenError] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate('/forgot-password', { replace: true });
      return;
    }

    api
      .get(`/auth/reset-password/validate?token=${token}`)
      .then(() => setTokenValid(true))
      .catch(() => {
        setTokenValid(false);
        setTokenError('El enlace de recuperación no es válido o ha expirado.');
      });
  }, [token, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError('');
    setServerError('');

    if (password.length < 8) {
      setPasswordError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
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
      setServerError(
        data?.error?.message || 'Ha ocurrido un error. Inténtalo de nuevo.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-muted/40 px-4 py-12">
      <div className="mb-8 flex flex-col items-center gap-2">
        <AtriaxLogo />
        <span className="text-lg font-semibold tracking-tight text-foreground">
          Atriax
        </span>
      </div>

      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Nueva contraseña</CardTitle>
          <CardDescription className="text-balance">
            Introduce tu nueva contraseña para recuperar el acceso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tokenValid === null && token && (
            <p className="text-center text-sm text-muted-foreground">
              Validando enlace...
            </p>
          )}

          {tokenValid === false && (
            <div className="text-center text-sm">
              <p className="text-destructive">{tokenError}</p>
              <p className="mt-3 text-muted-foreground">
                <Link to="/forgot-password" className="font-medium underline">
                  Solicitar un nuevo enlace
                </Link>
              </p>
            </div>
          )}

          {tokenValid === true && !success && (
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="password">Nueva contraseña</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="confirmPassword">
                    Confirmar contraseña
                  </FieldLabel>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </Field>

                {passwordError && <FieldError>{passwordError}</FieldError>}
                {serverError && <FieldError>{serverError}</FieldError>}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Guardando...' : 'Establecer nueva contraseña'}
                </Button>
              </FieldGroup>
            </form>
          )}

          {success && (
            <p className="text-center text-sm text-muted-foreground">
              Contraseña actualizada correctamente. Redirigiendo al inicio de
              sesión...
            </p>
          )}
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        <Link to="/login" className="font-medium underline">
          Volver al inicio de sesión
        </Link>
      </p>
    </div>
  );
}
