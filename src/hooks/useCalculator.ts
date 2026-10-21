/* Логика работы калькулятора. Состояние и вычисления калькулятора */

import { useState } from 'react';
import type { Operator, CalculatorKey } from '../types/calculator.types';

const MAX_DIGITS = 12;

/* Функция formatResult отвечает за форматирование результата для дисплея */
const formatResult = (value: number): string => {
  if (!Number.isFinite(value)) return 'Error';

  const result = String(Number(value.toPrecision(MAX_DIGITS)));

  return result.length > MAX_DIGITS
    ? value.toExponential(6)
    : result;
};

/* Функция calculate отвечает исключительно за математические вычисления */
const calculate = (
  a: number,
  b: number,
  op: Operator
): number => {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '×': return a * b;
    case '÷': return a / b;
  }
};


export const useCalculator = () => {
  const [display, setDisplay] = useState('0');
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<Operator | null>(null);
  const [reset, setReset] = useState(false);

/* Функция press определяет, что делать при нажатии кнопки */
  const press = (key: CalculatorKey): void => {
    if (key === 'C') {
      setDisplay('0');
      setPrev(null);
      setOp(null);
      setReset(false);
      return;
    }

    if (key === '±') {
      setDisplay(formatResult(-Number(display)));
      return;
    }

    if (key === '%') {
      setDisplay(formatResult(Number(display) / 100));
      return;
    }

    if (['+', '-', '×', '÷'].includes(key)) {
      setPrev(Number(display));
      setOp(key as Operator);
      setReset(true);
      return;
    }

    if (key === '=') {
      if (prev === null || op === null) return;

      const b = Number(display);

      if (op === '÷' && b === 0) {
        setDisplay("Can't divide by 0");
        setPrev(null);
        setOp(null);
        setReset(true);
        return;
      }

      const result = calculate(prev, b, op);

      setDisplay(formatResult(result));
      setPrev(null);
      setOp(null);
      setReset(true);
      return;
    }

    if (key === '.') {
      if (reset) {
        setDisplay('0.');
        setReset(false);
      } else if (!display.includes('.')) {
        if (display.replace(/[-.]/g, '').length >= MAX_DIGITS) return;
        setDisplay(display + '.');
      }
      return;
    }

    if (reset || display === '0' || display === "Can't divide by 0") {
      setDisplay(key);
      setReset(false);
      return;
    }

    if (display.replace(/[-.]/g, '').length >= MAX_DIGITS) return;

    setDisplay(display + key);
  };

  return { display, press };
};