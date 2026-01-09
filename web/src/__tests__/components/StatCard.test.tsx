import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import StatCard from '../../components/StatCard';
import { Calendar } from 'lucide-react';

describe('StatCard Component', () => {
  it('renders title and value', () => {
    render(
      <StatCard
        title="Total Appointments"
        value={45}
        icon={Calendar}
      />
    );

    expect(screen.getByText('Total Appointments')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
  });

  it('renders with description', () => {
    render(
      <StatCard
        title="Total Appointments"
        value={45}
        icon={Calendar}
        description="This month"
      />
    );

    expect(screen.getByText('This month')).toBeInTheDocument();
  });

  it('renders with trend indicator', () => {
    render(
      <StatCard
        title="Total Appointments"
        value={45}
        icon={Calendar}
        trend={{ value: 12, isPositive: true }}
      />
    );

    expect(screen.getByText(/12%/)).toBeInTheDocument();
  });

  it('applies custom colors', () => {
    const { container } = render(
      <StatCard
        title="Total Appointments"
        value={45}
        icon={Calendar}
        iconColor="text-red-600"
        iconBgColor="bg-red-100"
      />
    );

    const iconContainer = container.querySelector('.bg-red-100');
    expect(iconContainer).toBeInTheDocument();
  });
});
