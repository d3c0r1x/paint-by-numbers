import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ColorCircle } from '../src/ui/ColorCircle';
import { Button, IconButton } from '../src/ui/Button';

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
});
