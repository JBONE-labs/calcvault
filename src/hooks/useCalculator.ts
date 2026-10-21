import { useState } from 'react';
import type { Operator, CalculatorKey } from '../types/calculator.types';
import { calculate, formatResult, canAppendDigit } from '../utils/calculator.utils';
import { useAccessCode } from './useAccessCode';

export const useCalculator = () => {
  const [display, setDisplay] = useState('0');
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<Operator | null>(null);
  const [reset, setReset] = useState(false);

  const {
    settingsUnlocked,
    trackAccessKey,
  } = useAccessCode();

  const press = (key: CalculatorKey): void => {
    // Проверка скрытого кода не зависит от математических вычислений.
    trackAccessKey(key);

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

      setDisplay(formatResult(calculate(prev, b, op)));
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
        if (!canAppendDigit(display)) return;
        setDisplay(`${display}.`);
      }
      return;
    }

    if (reset || display === '0' || display === "Can't divide by 0") {
      setDisplay(key);
      setReset(false);
      return;
    }

    if (!canAppendDigit(display)) return;

    setDisplay(display + key);
  };

  return {
    display,
    press,
    settingsUnlocked,
  };
};