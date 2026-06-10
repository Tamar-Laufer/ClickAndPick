import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from '../Modal';

describe('<Modal>', () => {
  it('renders its children', () => {
    render(<Modal onClose={() => {}}><p>Hello modal</p></Modal>);
    expect(screen.getByText('Hello modal')).toBeInTheDocument();
  });

  it('closes when the backdrop (overlay) is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(<Modal onClose={onClose}><p>Body</p></Modal>);
    fireEvent.click(container.querySelector('.modal-overlay'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT close when the dialog box itself is clicked (stopPropagation)', () => {
    const onClose = vi.fn();
    const { container } = render(<Modal onClose={onClose}><p>Body</p></Modal>);
    fireEvent.click(container.querySelector('.modal-box'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on the Escape key', () => {
    const onClose = vi.fn();
    render(<Modal onClose={onClose}><p>Body</p></Modal>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('with closeOnBackdrop=false, ignores backdrop clicks but still closes on Esc', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal onClose={onClose} closeOnBackdrop={false}><p>Body</p></Modal>,
    );
    fireEvent.click(container.querySelector('.modal-overlay'));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders the ✕ button when showClose is set, and it closes', () => {
    const onClose = vi.fn();
    render(<Modal onClose={onClose} showClose><p>Body</p></Modal>);
    fireEvent.click(screen.getByRole('button', { name: 'סגור' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('exposes dialog semantics for assistive tech', () => {
    render(<Modal onClose={() => {}}><p>Body</p></Modal>);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });
});
