/**
 * Frontend Test Infrastructure — Verification Tests
 *
 * Validates that the testing environment is correctly configured:
 * - Vitest executes
 * - jsdom loads
 * - React Testing Library works
 * - jest-dom matchers are available
 * - Browser API mocks function correctly
 * - React Query wrapper works
 */

/// <reference types="vitest/globals" />

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../utils/render';

describe('Frontend Test Infrastructure', () => {
  it('executes basic assertions', () => {
    expect(true).toBe(true);
  });

  it('renders a component with React Testing Library', () => {
    const TestComponent = () => <span data-testid="hello">Hello World</span>;
    render(<TestComponent />);
    const el = screen.getByTestId('hello');
    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent('Hello World');
  });

  it('supports jest-dom matchers', () => {
    const el = document.createElement('div');
    el.textContent = 'Test';
    document.body.appendChild(el);
    expect(el).toBeInTheDocument();
    expect(el).toHaveTextContent('Test');
    document.body.removeChild(el);
  });

  it('supports fireEvent interactions', () => {
    const handleClick = vi.fn();
    const TestComponent = () => (
      <button onClick={handleClick}>Click</button>
    );
    render(<TestComponent />);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('wraps components with QueryWrapper', () => {
    const TestComponent = () => <div>Query Wrapped</div>;
    render(<TestComponent />);
    expect(screen.getByText('Query Wrapped')).toBeInTheDocument();
  });
});

describe('Browser API Mocks', () => {
  it('mocks matchMedia', () => {
    expect(globalThis.matchMedia).toBeDefined();
    const mq = globalThis.matchMedia('(min-width: 768px)');
    expect(mq.matches).toBe(false);
  });

  it('mocks ResizeObserver', () => {
    expect(globalThis.ResizeObserver).toBeDefined();
    const observer = new (globalThis as any).ResizeObserver(() => {});
    expect(() => observer.observe(document.body)).not.toThrow();
    expect(() => observer.unobserve(document.body)).not.toThrow();
    expect(() => observer.disconnect()).not.toThrow();
  });

  it('mocks IntersectionObserver', () => {
    expect(globalThis.IntersectionObserver).toBeDefined();
    const observer = new (globalThis as any).IntersectionObserver(() => {});
    expect(() => observer.observe(document.body)).not.toThrow();
    expect(() => observer.unobserve(document.body)).not.toThrow();
    expect(() => observer.disconnect()).not.toThrow();
  });

  it('mocks scroll APIs', () => {
    const el = document.createElement('div');
    expect(() => el.scrollIntoView()).not.toThrow();
    expect(() => el.scroll()).not.toThrow();
    expect(() => el.scrollTo()).not.toThrow();
    expect(() => el.scrollBy()).not.toThrow();
  });

  it('mocks requestAnimationFrame', () => {
    expect(globalThis.requestAnimationFrame).toBeDefined();
    const id = globalThis.requestAnimationFrame(() => {});
    expect(typeof id).toBe('number');
    globalThis.cancelAnimationFrame(id);
    expect(globalThis.cancelAnimationFrame).toBeDefined();
  });
});
