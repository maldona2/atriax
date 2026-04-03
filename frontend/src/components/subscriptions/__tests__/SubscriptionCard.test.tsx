import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SubscriptionCard } from '../SubscriptionCard';
import type { SubscriptionPlan } from '@/hooks/useSubscription';

describe('SubscriptionCard', () => {
  const mockPlan: SubscriptionPlan = {
    name: 'pro',
    displayName: 'Pro',
    priceARS: 30000,
    features: {
      appointments: true,
      calendarSync: true,
      patientDatabase: true,
      aiFeatures: false,
      whatsappIntegration: false,
    },
  };

  it('should render plan information', () => {
    const onSubscribe = vi.fn();
    render(<SubscriptionCard plan={mockPlan} onSubscribe={onSubscribe} />);

    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText(/30\.000/)).toBeInTheDocument();
  });

  it('should show current plan badge when active', () => {
    const onSubscribe = vi.fn();
    render(
      <SubscriptionCard
        plan={mockPlan}
        currentPlan="pro"
        onSubscribe={onSubscribe}
      />
    );

    expect(screen.getByText('Actual')).toBeInTheDocument();
    expect(screen.getByText('Plan actual')).toBeInTheDocument();
  });

  it('should render gold plan features', () => {
    const goldPlan: SubscriptionPlan = {
      name: 'gold',
      displayName: 'Gold',
      priceARS: 50000,
      features: {
        appointments: true,
        calendarSync: true,
        patientDatabase: true,
        aiFeatures: true,
        whatsappIntegration: true,
      },
    };

    const onSubscribe = vi.fn();
    render(<SubscriptionCard plan={goldPlan} onSubscribe={onSubscribe} />);

    expect(screen.getByText('Funciones de IA')).toBeInTheDocument();
    expect(screen.getByText('Integración con WhatsApp')).toBeInTheDocument();
  });
});
