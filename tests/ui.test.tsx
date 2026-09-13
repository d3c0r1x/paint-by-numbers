import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ColorCircle } from '../src/ui/ColorCircle';
import { Button, IconButton } from '../src/ui/Button';
import { createRef } from 'react';
import { A11yProvider } from '../src/a11y/A11yContext';
import { AccessibilitySettings } from '../src/a11y/AccessibilitySettings';

describe('ColorCircle', () => {
  it('показывает символ цвета для цветного кружка', () => {
    // ariaLabel = symbolFor(index) → "1"
    render(<ColorCircle hex="#ff0000" number={1} active onClick={() => {}} />);
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
  });

  it('не показывает цифру для пользовательского цвета (number=null)', () => {
    // ariaLabel = hex (#abcdef), цифры нет
    render(<ColorCircle hex="#abcdef" number={null} onClick={() => {}} />);
    expect(screen.getByRole('button', { name: '#abcdef' })).toBeInTheDocument();
    // убедимся, что внутри нет элемента с цифрой
    const btn = screen.getByRole('button', { name: '#abcdef' });
    expect(btn.querySelector('span')).toBeNull();
  });

  it('белая цифра на тёмном фоне, чёрная на светлом (YIQ heuristic)', () => {
    const { rerender } = render(<ColorCircle hex="#000033" number={1} onClick={() => {}} />);
    // span внутри кнопки — он имеет style.color
    let span = screen.getByRole('button', { name: '1' }).querySelector('span') as HTMLElement;
    expect(span.style.color).toBe('rgb(255, 255, 255)'); // белая на тёмном

    rerender(<ColorCircle hex="#ffffff" number={2} onClick={() => {}} />);
    span = screen.getByRole('button', { name: '2' }).querySelector('span') as HTMLElement;
    expect(span.style.color).toBe('rgb(28, 25, 23)'); // чёрная на белом
  });

  it('активный круг больше и с обводкой', () => {
    const { rerender } = render(
      <ColorCircle hex="#ff0000" number={1} active={false} onClick={() => {}} />,
    );
    let button = screen.getByRole('button', { name: '1' });
    expect(button.className).toContain('h-11'); // неактивный размер
    expect(button.className).not.toContain('ring-2'); // нет обводки

    rerender(<ColorCircle hex="#ff0000" number={1} active={true} onClick={() => {}} />);
    button = screen.getByRole('button', { name: '1' });
    expect(button.className).toContain('h-14'); // активный размер
    expect(button.className).toContain('ring-2'); // есть обводка
  });
});

describe('Button', () => {
  it('primary-кнопка имеет текст', () => {
    render(
      <Button variant="primary" onClick={() => {}}>
        Открыть
      </Button>,
    );
    const btn = screen.getByRole('button', { name: 'Открыть' });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveTextContent('Открыть');
  });

  it('disabled-кнопка недоступна', () => {
    render(
      <Button variant="primary" disabled onClick={() => {}}>
        Сохранить
      </Button>,
    );
    const btn = screen.getByRole('button', { name: 'Сохранить' });
    expect(btn).toBeDisabled();
  });

  it('secondary-кнопка без scarily-стилей', () => {
    render(
      <Button variant="secondary" onClick={() => {}}>
        Экспорт
      </Button>,
    );
    expect(screen.getByRole('button', { name: 'Экспорт' })).toBeInTheDocument();
  });
});

describe('IconButton', () => {
  it('имеет aria-label', () => {
    render(
      <IconButton label="Отмена" onClick={() => {}}>
        <span data-testid="icon">↩</span>
      </IconButton>,
    );
    expect(screen.getByRole('button', { name: 'Отмена' })).toBeInTheDocument();
  });

  it('disabled-иконка недоступна', () => {
    render(
      <IconButton label="Сохранить" disabled onClick={() => {}}>
        💾
      </IconButton>,
    );
    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeDisabled();
  });

  it('поддерживает ref forwarding', () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <IconButton label="Test" onClick={() => {}} ref={ref}>
        <span>icon</span>
      </IconButton>,
    );
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current?.tagName).toBe('BUTTON');
  });

  it('вызывает onClick по Enter', () => {
    const onClick = vi.fn();
    render(
      <IconButton label="Test" onClick={onClick}>
        <span>icon</span>
      </IconButton>,
    );
    const btn = screen.getByRole('button', { name: 'Test' });
    fireEvent.keyDown(btn, { key: 'Enter' });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('вызывает onClick по Space', () => {
    const onClick = vi.fn();
    render(
      <IconButton label="Test" onClick={onClick}>
        <span>icon</span>
      </IconButton>,
    );
    const btn = screen.getByRole('button', { name: 'Test' });
    fireEvent.keyDown(btn, { key: ' ' });
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('Button accessibility', () => {
  it('имеет focus-visible ring класс', () => {
    render(
      <Button variant="primary" onClick={() => {}}>
        Click me
      </Button>,
    );
    const btn = screen.getByRole('button', { name: 'Click me' });
    expect(btn.className).toContain('focus-visible:outline-none');
    expect(btn.className).toContain('focus-visible:ring-2');
  });

  it('поддерживает ref forwarding', () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <Button variant="primary" onClick={() => {}} ref={ref}>
        Click me
      </Button>,
    );
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('вызывает onClick по Enter', () => {
    const onClick = vi.fn();
    render(
      <Button variant="primary" onClick={onClick}>
        Click me
      </Button>,
    );
    const btn = screen.getByRole('button', { name: 'Click me' });
    fireEvent.keyDown(btn, { key: 'Enter' });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('вызывает onClick по Space', () => {
    const onClick = vi.fn();
    render(
      <Button variant="primary" onClick={onClick}>
        Click me
      </Button>,
    );
    const btn = screen.getByRole('button', { name: 'Click me' });
    fireEvent.keyDown(btn, { key: ' ' });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('имеет type=button по умолчанию', () => {
    render(
      <Button variant="primary" onClick={() => {}}>
        Click me
      </Button>,
      { wrapper: ({ children }) => <form onSubmit={() => {}}>{children}</form> },
    );
    const btn = screen.getByRole('button', { name: 'Click me' }) as HTMLButtonElement;
    expect(btn.type).toBe('button');
  });
});

describe('IconButton accessibility', () => {
  it('имеет focus-visible ring класс', () => {
    render(
      <IconButton label="Test" onClick={() => {}}>
        <span>icon</span>
      </IconButton>,
    );
    const btn = screen.getByRole('button', { name: 'Test' });
    expect(btn.className).toContain('focus-visible:outline-none');
    expect(btn.className).toContain('focus-visible:ring-2');
  });
});

describe('AccessibilitySettings', () => {
  it('переключает high-contrast класс на document.documentElement', () => {
    const originalItem = localStorage.getItem('pbn.a11y');
    try {
      render(
        <A11yProvider>
          <AccessibilitySettings onClose={() => {}} />
        </A11yProvider>,
      );
      expect(document.documentElement.classList.contains('high-contrast')).toBe(false);

      // кликаем по кнопке переключения high contrast
      const toggleButton = screen.getByRole('button', { name: /высокий контраст/i });
      fireEvent.click(toggleButton);

      expect(document.documentElement.classList.contains('high-contrast')).toBe(true);

      // переключаем обратно
      fireEvent.click(toggleButton);
      expect(document.documentElement.classList.contains('high-contrast')).toBe(false);
    } finally {
      if (originalItem !== null) localStorage.setItem('pbn.a11y', originalItem);
    }
  });

  it('устанавливает CSS-переменную --font-scale при выборе размера шрифта', () => {
    const originalItem = localStorage.getItem('pbn.a11y');
    try {
      render(
        <A11yProvider>
          <AccessibilitySettings onClose={() => {}} />
        </A11yProvider>,
      );
      // по умолчанию medium (1)
      expect(document.documentElement.style.getPropertyValue('--font-scale')).toBe('1');

      // выбираем small
      const smallButton = screen.getByRole('button', { name: /маленький/i });
      fireEvent.click(smallButton);
      expect(document.documentElement.style.getPropertyValue('--font-scale')).toBe('0.875');

      // выбираем large
      const largeButton = screen.getByRole('button', { name: /большой/i });
      fireEvent.click(largeButton);
      expect(document.documentElement.style.getPropertyValue('--font-scale')).toBe('1.25');
    } finally {
      if (originalItem !== null) localStorage.setItem('pbn.a11y', originalItem);
    }
  });

  it('кнопка high contrast имеет aria-pressed', () => {
    render(
      <A11yProvider>
        <AccessibilitySettings onClose={() => {}} />
      </A11yProvider>,
    );
    const toggleButton = screen.getByRole('button', { name: /высокий контраст/i });
    expect(toggleButton).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(toggleButton);
    expect(toggleButton).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(toggleButton);
    expect(toggleButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('кнопки размера шрифта имеют aria-pressed', () => {
    render(
      <A11yProvider>
        <AccessibilitySettings onClose={() => {}} />
      </A11yProvider>,
    );
    const mediumButton = screen.getByRole('button', { name: /средний/i });
    expect(mediumButton).toHaveAttribute('aria-pressed', 'true');

    const smallButton = screen.getByRole('button', { name: /маленький/i });
    fireEvent.click(smallButton);
    expect(mediumButton).toHaveAttribute('aria-pressed', 'false');
    expect(smallButton).toHaveAttribute('aria-pressed', 'true');
  });
});
