
/* Логика работы калькулятора. Состояние и вычисления калькулятора */

import { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { Operator, CalculatorKey } from '../types/calculator.types';

const MAX_DIGITS = 12;
const MIN_CODE_LENGTH = 5;
const MAX_CODE_LENGTH = 64;

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

/*
 * Преобразует клавишу интерфейса в символ,
 * допустимый для кода доступа в Rust.
 */
const getAccessCharacter = (key: CalculatorKey): string | null => {
  if (/^[0-9]$/.test(key)) return key;

  switch (key) {
    case '+':
    case '-':
    case '.':
    case '%':
    case '=':
      return key;

    case '×':
      return '*';

    case '÷':
      return '/';

    default:
      return null;
  }
};

export const useCalculator = () => {
  const [display, setDisplay] = useState('0');
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<Operator | null>(null);
  const [reset, setReset] = useState(false);

  const [settingsUnlocked, setSettingsUnlocked] = useState(false);

  // Буфер секретной последовательности не зависит от дисплея.
  const accessSequenceRef = useRef('');
  const accessCodeLengthRef = useRef<number | null>(null);
  const verificationInProgressRef = useRef(false);
  const settingsUnlockedRef = useRef(false);

  /*
   * Получаем актуальную длину кода из Rust.
   * Сам код доступа во frontend не хранится.
   */
  useEffect(() => {
    let cancelled = false;

    invoke<number>('get_access_code_length')
      .then((length) => {
        if (cancelled) return;

        if (
          Number.isInteger(length) &&
          length >= MIN_CODE_LENGTH &&
          length <= MAX_CODE_LENGTH
        ) {
          accessCodeLengthRef.current = length;
        } else {
          console.error('Invalid access-code length');
        }
      })
      .catch((error: unknown) => {
        console.error('Failed to load access-code length:', error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Проверяем последовательность независимо от вычислений.
   * Проверка запускается сразу после ввода последнего символа.
   */
  const trackAccessSequence = (key: CalculatorKey): void => {
    if (verificationInProgressRef.current) {
      return;
    }

    const codeLength = accessCodeLengthRef.current;

    if (codeLength === null) return;

    const character = getAccessCharacter(key);

    // Недопустимая для кода клавиша прерывает последовательность.
    if (character === null) {
      accessSequenceRef.current = '';
      return;
    }

    accessSequenceRef.current += character;

    if (accessSequenceRef.current.length < codeLength) {
      return;
    }

    // Проверяем последовательность ровно нужной длины.
    const candidate = accessSequenceRef.current.slice(-codeLength);

    accessSequenceRef.current = '';
    verificationInProgressRef.current = true;

    void invoke<boolean>('verify_access_code', { code: candidate })
      .then((isValid) => {
        if (isValid) {
          const nextUnlocked = !settingsUnlockedRef.current;

          settingsUnlockedRef.current = nextUnlocked;
          setSettingsUnlocked(nextUnlocked);
        }
      })
      .catch((error: unknown) => {
        console.error('Failed to verify access code:', error);
      })
      .finally(() => {
        verificationInProgressRef.current = false;
      });
  };

  /* Функция press определяет, что делать при нажатии кнопки */
  const press = (key: CalculatorKey): void => {
    // Отслеживание кода выполняется до обычной логики калькулятора.
    trackAccessSequence(key);

    if (key === 'C') {
      accessSequenceRef.current = '';

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

  return {
    display,
    press,
    settingsUnlocked,
  };
};
