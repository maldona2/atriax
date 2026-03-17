import { FileText, Clock, Zap, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { SubscriptionStatus } from '@/hooks/useSubscription';

interface UsageStatsProps {
  status: SubscriptionStatus;
}

function formatNumber(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toString();
}

function calculatePercentage(used: number, limit: number): number {
  if (limit === -1) return 0; // Unlimited
  if (limit === 0) return 100;
  return Math.min((used / limit) * 100, 100);
}

export function UsageStats({ status }: UsageStatsProps) {
  const stats = [
    {
      icon: FileText,
      label: 'Notas clínicas',
      used: status.usage.clinicalNotesUsed,
      limit: status.usage.clinicalNotesLimit,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      icon: Clock,
      label: 'Minutos de grabación',
      used: status.usage.recordingMinutesUsed,
      limit: status.usage.recordingMinutesLimit,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
      suffix: ' min',
    },
    {
      icon: Zap,
      label: 'Tokens de IA',
      used: status.usage.tokensUsed,
      limit: status.usage.tokensLimit,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
    },
    {
      icon: DollarSign,
      label: 'Costo de IA',
      used: status.usage.costUsedUSD,
      limit: status.usage.costLimitUSD,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      prefix: '$',
      suffix: ' USD',
      decimals: 2,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {stats.map((stat) => {
        const percentage = calculatePercentage(stat.used, stat.limit);
        const isUnlimited = stat.limit === -1;
        const Icon = stat.icon;

        return (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${stat.bgColor}`}
                    >
                      <Icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{stat.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {isUnlimited ? (
                          'Ilimitado'
                        ) : (
                          <>
                            {stat.prefix}
                            {stat.decimals
                              ? stat.used.toFixed(stat.decimals)
                              : formatNumber(stat.used)}
                            {stat.suffix || ''} de {stat.prefix}
                            {stat.decimals
                              ? stat.limit.toFixed(stat.decimals)
                              : formatNumber(stat.limit)}
                            {stat.suffix || ''}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
                {!isUnlimited && (
                  <Progress
                    value={percentage}
                    className="h-2"
                    indicatorClassName={
                      percentage >= 90
                        ? 'bg-destructive'
                        : percentage >= 75
                          ? 'bg-amber-500'
                          : 'bg-primary'
                    }
                  />
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
