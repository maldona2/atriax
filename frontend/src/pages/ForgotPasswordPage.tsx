import { useState } from 'react';
import { Link } from 'react-router-dom';
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

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailError('');

    if (!isValidEmail(email)) {
      setEmailError('Introduce un email con formato válido.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
    } catch {
      // Show confirmation regardless of outcome (including not-found)
    } finally {
      setLoading(false);
      setConfirmed(true);
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
          <CardTitle className="text-xl">Recuperar contraseña</CardTitle>
          <CardDescription className="text-balance">
            Introduce tu email y te enviaremos un enlace para restablecer tu
            contraseña.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {confirmed ? (
            <p className="text-center text-sm text-muted-foreground">
              Si el email está registrado, recibirás un enlace en breve.
            </p>
          ) : (
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
                    autoComplete="email"
                  />
                  {emailError && <FieldError>{emailError}</FieldError>}
                </Field>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                </Button>
              </FieldGroup>
            </form>
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
