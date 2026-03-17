import { Calendar, Users, Bot, MessageCircle, Check, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { SubscriptionStatus } from '@/hooks/useSubscription';

interface FeatureStatusProps {
  status: SubscriptionStatus;
}

export function FeatureStatus({ status }: FeatureStatusProps) {
  const features = [
    {
      icon: Calendar,
      label: 'Gestión de citas',
      enabled: status.features.appointments,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      icon: Calendar,
      label: 'Sincronización con Google Calendar',
      enabled: status.features.calendarSync,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      icon: Users,
      label: 'Base de datos de pacientes',
      enabled: status.features.patientDatabase,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      icon: Bot,
      label: 'Funciones de IA',
      enabled: status.features.aiFeatures,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
      comingSoon: !status.features.aiFeatures,
    },
    {
      icon: MessageCircle,
      label: 'Integración con WhatsApp',
      enabled: status.features.whatsappIntegration,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
      comingSoon: !status.features.whatsappIntegration,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {features.map((feature) => {
        const Icon = feature.icon;
        const StatusIcon = feature.enabled ? Check : X;

        return (
          <Card key={feature.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${feature.bgColor}`}
                >
                  <Icon className={`h-5 w-5 ${feature.color}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{feature.label}</p>
                    <StatusIcon
                      className={`h-4 w-4 ${
                        feature.enabled ? 'text-green-600' : 'text-gray-400'
                      }`}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {feature.enabled
                      ? 'Disponible'
                      : feature.comingSoon
                        ? 'Próximamente'
                        : 'No disponible'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
