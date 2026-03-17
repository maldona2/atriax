import { Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { SubscriptionPlan } from '@/hooks/useSubscription';

interface SubscriptionCardProps {
  plan: SubscriptionPlan;
  currentPlan?: string;
  onSubscribe: (planName: string) => void;
  loading?: boolean;
}

export function SubscriptionCard({
  plan,
  currentPlan,
  onSubscribe,
  loading,
}: SubscriptionCardProps) {
  const isCurrentPlan = currentPlan === plan.name;
  const isPro = plan.name === 'pro';
  const isGold = plan.name === 'gold';
  const isDisabled = plan.disabled;

  return (
    <Card className={isCurrentPlan ? 'border-primary shadow-md' : ''}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {plan.displayName}
              {isCurrentPlan && (
                <Badge variant="default" className="text-xs">
                  Actual
                </Badge>
              )}
              {isGold && <Sparkles className="h-4 w-4 text-amber-500" />}
              {isDisabled && (
                <Badge variant="secondary" className="text-xs">
                  Próximamente
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-2">
              {isPro && 'Plan profesional con funciones básicas'}
              {isGold && 'Plan premium con IA y WhatsApp'}
            </CardDescription>
          </div>
        </div>
        <div className="pt-4">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold">
              ${plan.priceARS.toLocaleString('es-AR')}
            </span>
            <span className="text-sm text-muted-foreground">/mes</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-primary" />
            <span>Gestión de citas</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-primary" />
            <span>Sincronización con Google Calendar</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-primary" />
            <span>Base de datos de pacientes</span>
          </div>
          {plan.features.aiFeatures && (
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-primary" />
              <span>Funciones de IA</span>
            </div>
          )}
          {plan.features.whatsappIntegration && (
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-primary" />
              <span>Integración con WhatsApp</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        {isCurrentPlan ? (
          <Button variant="outline" className="w-full" disabled>
            Plan actual
          </Button>
        ) : (
          <Button
            className="w-full"
            onClick={() => onSubscribe(plan.name)}
            disabled={loading || isDisabled}
            variant={isGold ? 'default' : 'outline'}
          >
            {isDisabled ? 'Próximamente' : 'Suscribirse'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
