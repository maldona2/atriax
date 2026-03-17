import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SubscriptionCard } from '../SubscriptionCard';
import type { SubscriptionPlan } from '@/hooks/useSubscription';

describe('SubscriptionCard', () => {
  const mockPlan: SubscriptionPlan = {
    name: 'pro',
    displayName: 'Pro',
    priceARS: 15000,
    limits: {
      clinicalNotesMonthly: 100,
      recordingMinutesDaily: 120,
      tokensMonthly: 1000000,
      costMonthlyUSD: 10,
    },
  };

  it('should render plan information', () => {
    const onSubscribe = vi.fn();
    render(<SubscriptionCard plan={mockPlan} onSubscribe={onSubscribe} />);

    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText(/15\.000/)).toBeInTheDocument();
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

  it('should format unlimited limits correctly', () => {
    const unlimitedPlan: SubscriptionPlan = {
      name: 'enterprise',
      displayName: 'Enterprise',
      priceARS: 50000,
      limits: {
        clinicalNotesMonthly: -1,
        recordingMinutesDaily: -1,
        tokensMonthly: -1,
        costMonthlyUSD: -1,
      },
    };

    const onSubscribe = vi.fn();
    render(<SubscriptionCard plan={unlimitedPlan} onSubscribe={onSubscribe} />);

    const unlimitedTexts = screen.getAllByText(/Ilimitado/);
    expect(unlimitedTexts.length).toBeGreaterThan(0);
  });
});
