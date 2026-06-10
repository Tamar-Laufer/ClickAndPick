import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FormInput from '../FormInput';

describe('<FormInput>', () => {
  it('renders the label and an input', () => {
    render(<FormInput label="אימייל" name="email" />);
    expect(screen.getByText('אימייל')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('forwards arbitrary input props (type, name, placeholder, required)', () => {
    render(<FormInput label="טלפון" name="phone" type="tel" placeholder="050-0000000" required />);
    const input = screen.getByPlaceholderText('050-0000000');
    expect(input).toHaveAttribute('name', 'phone');
    expect(input).toHaveAttribute('type', 'tel');
    expect(input).toBeRequired();
  });

  it('supports controlled value + onChange', () => {
    const onChange = vi.fn();
    render(<FormInput label="שם" name="name" value="Dana" onChange={onChange} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('Dana');
    fireEvent.change(input, { target: { value: 'Danah' } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
