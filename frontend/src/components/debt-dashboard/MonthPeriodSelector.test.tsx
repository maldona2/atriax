import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MonthPeriodSelector } from './MonthPeriodSelector';

function MonthPeriodSelectorHarness() {
  const [month, setMonth] = useState('2026-07');

  return <MonthPeriodSelector value={month} onValueChange={setMonth} />;
}

describe('MonthPeriodSelector', () => {
  it('moves to adjacent months with the navigation buttons', async () => {
    const user = userEvent.setup();
    render(<MonthPeriodSelectorHarness />);

    await user.click(screen.getByRole('button', { name: 'Ver mes siguiente' }));

    expect(
      screen.getByRole('button', { name: /Elegir mes.*agosto de 2026/i })
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ver mes anterior' }));

    expect(
      screen.getByRole('button', { name: /Elegir mes.*julio de 2026/i })
    ).toBeInTheDocument();
  });

  it('selects a month from the shadcn popover', async () => {
    const user = userEvent.setup();
    render(<MonthPeriodSelectorHarness />);

    await user.click(
      screen.getByRole('button', { name: /Elegir mes.*julio de 2026/i })
    );
    await user.click(screen.getByRole('button', { name: 'ene' }));

    expect(
      screen.getByRole('button', { name: /Elegir mes.*enero de 2026/i })
    ).toBeInTheDocument();
  });
});
