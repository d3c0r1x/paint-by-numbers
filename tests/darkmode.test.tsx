import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { DarkModeToggle } from '../src/ui/DarkModeToggle';
import { useAppStore } from '../src/store/useAppStore';

describe('DarkModeToggle', () => {
  afterEach(() => {
    cleanup();
    useAppStore.setState({ darkMode: false });
    document.documentElement.removeAttribute('data-theme');
  });

  it('показывает иконку солнца в светлом режиме', () => {
    useAppStore.setState({ darkMode: false });
    render(<DarkModeToggle />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Включить тёмный режим');
  });

  it('переключает darkMode в store при клике', () => {
    useAppStore.setState({ darkMode: false });
    render(<DarkModeToggle />);
    const btn = screen.getByRole('button');
    btn.click();
    // После клика store должен быть в состоянии darkMode=true
    expect(useAppStore.getState().darkMode).toBe(true);
  });

  it('показывает иконку луны в тёмном режиме', () => {
    useAppStore.setState({ darkMode: true });
    render(<DarkModeToggle />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Выключить тёмный режим');
  });
});
