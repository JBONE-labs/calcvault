import type { Operator } from '../types/calculator.types';

const MAX_DIGITS = 12;

export const formatResult = (value: number): string => {
  if (!Number.isFinite(value)) return 'Error';

  const result = String(Number(value.toPrecision(MAX_DIGITS)));

  return result.length > MAX_DIGITS
    ? value.toExponential(6)
    : result;
};

export const calculate = (
  a: number,
  b: number,
  operator: Operator,
): number => {
  switch (operator) {
    case '+':
      return a + b;
    case '-':
      return a - b;
    case '×':
      return a * b;
    case '÷':
      return a / b;
  }
};

export const canAppendDigit = (display: string): boolean =>
  display.replace(/[-.]/g, '').length < MAX_DIGITS;
