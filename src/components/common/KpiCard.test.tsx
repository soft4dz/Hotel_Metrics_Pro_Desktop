import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrendingUp } from 'lucide-react';
import { KpiCard } from './KpiCard';

const baseProps = { title: 'CA Total', value: '1 234 500 DA', icon: TrendingUp };

describe('KpiCard', () => {
  it('affiche le titre et la valeur', () => {
    render(<KpiCard {...baseProps} />);
    expect(screen.getByText('CA Total')).toBeInTheDocument();
    expect(screen.getByText('1 234 500 DA')).toBeInTheDocument();
  });

  it('affiche le sous-titre quand fourni', () => {
    render(<KpiCard {...baseProps} subtitle="vs mois précédent" />);
    expect(screen.getByText('vs mois précédent')).toBeInTheDocument();
  });

  it('n\'affiche pas de sous-titre quand absent', () => {
    render(<KpiCard {...baseProps} />);
    expect(screen.queryByText('vs mois précédent')).toBeNull();
  });

  it('affiche la tendance positive avec signe +', () => {
    render(<KpiCard {...baseProps} trend={12.5} />);
    expect(screen.getByText(/\+12\.5/)).toBeInTheDocument();
  });

  it('affiche la tendance négative avec signe -', () => {
    render(<KpiCard {...baseProps} trend={-8.3} />);
    expect(screen.getByText(/-8\.3/)).toBeInTheDocument();
  });

  it('n\'affiche pas de tendance quand trend est undefined', () => {
    const { container } = render(<KpiCard {...baseProps} />);
    expect(container.querySelector('[data-testid="trend"]')).toBeNull();
  });
});
