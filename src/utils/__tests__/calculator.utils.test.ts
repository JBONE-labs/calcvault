import { describe, expect, it } from 'vitest';
import {
  calculate,
  canAppendDigit,
  formatResult,
} from '../calculator.utils';

describe('calculate', () => {
  it('складывает числа', () => {
    expect(calculate(2, 3, '+')).toBe(5);
  });

  it('вычитает числа', () => {
    expect(calculate(9, 4, '-')).toBe(5);
  });

  it('умножает числа', () => {
    expect(calculate(6, 7, '×')).toBe(42);
  });

  it('делит числа', () => {
    expect(calculate(8, 2, '÷')).toBe(4);
  });

  it('возвращает Infinity при делении на ноль', () => {
    // Отображение сообщения об ошибке для этого случая
    // отдельно обрабатывается в useCalculator.
    expect(calculate(1, 0, '÷')).toBe(Infinity);
  });
});

describe('formatResult', () => {
  it('использует экспоненциальную запись, если форматированная строка длиннее 12 символов', () => {
    expect(formatResult(1 / 3)).toBe('3.333333e-1');
  });

  it('возвращает Error для Infinity', () => {
    expect(formatResult(Infinity)).toBe('Error');
  });

  it('возвращает Error для NaN', () => {
    expect(formatResult(Number.NaN)).toBe('Error');
  });
});

describe('canAppendDigit', () => {
  it('разрешает ввод, пока не достигнут лимит в 12 цифр', () => {
    expect(canAppendDigit('12345678901')).toBe(true);
  });

  it('запрещает ввод после достижения лимита в 12 цифр', () => {
    expect(canAppendDigit('123456789012')).toBe(false);
  });

  it('не считает знак минус и десятичную точку цифрами', () => {
    expect(canAppendDigit('-12345678901.')).toBe(true);
  });
});