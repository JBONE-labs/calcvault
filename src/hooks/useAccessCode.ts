/* хук, который отслеживает последовательность нажатий, проверяет введённый код доступа и управляет состоянием разблокировки настроек. */

import { useCallback, useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { CalculatorKey } from '../types/calculator.types';

const MIN_CODE_LENGTH = 5;
const MAX_CODE_LENGTH = 64;

const getAccessCharacter = (key: CalculatorKey): string | null => {
  if (/^[0-9]$/.test(key)) {
    return key;
  }

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

export const useAccessCode = () => {
  const [settingsUnlocked, setSettingsUnlocked] = useState(false);

  const codeLengthRef = useRef<number | null>(null);
  const sequenceRef = useRef('');
  const verificationInProgressRef = useRef(false);

  // Загружает актуальную длину кода из Rust.
  const refreshAccessCodeLength = useCallback(async (): Promise<void> => {
    const length = await invoke<number>('get_access_code_length');

    if (
      !Number.isInteger(length) ||
      length < MIN_CODE_LENGTH ||
      length > MAX_CODE_LENGTH
    ) {
      throw new Error('Invalid access-code length');
    }

    codeLengthRef.current = length;
    sequenceRef.current = '';
  }, []);

  // Загружаем длину кода при первом рендере.
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
          codeLengthRef.current = length;
        } else {
          console.error('Invalid access-code length');
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          console.error('Failed to load access-code length:', error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Очищает текущую последовательность ввода.
  const resetAccessSequence = useCallback((): void => {
    sequenceRef.current = '';
  }, []);

  // Обрабатывает каждое нажатие клавиши калькулятора.
  const trackAccessKey = useCallback((key: CalculatorKey): void => {
    if (verificationInProgressRef.current) {
      return;
    }

    const codeLength = codeLengthRef.current;

    // Пока длина кода не загружена, ввод не проверяем.
    if (codeLength === null) {
      return;
    }

    const character = getAccessCharacter(key);

    // Нажатие C или ± сбрасывает последовательность.
    if (character === null) {
      sequenceRef.current = '';
      return;
    }

    sequenceRef.current += character;

    // Пока не набрана нужная длина, продолжаем собирать код.
    if (sequenceRef.current.length < codeLength) {
      return;
    }

    // Проверяем последние N символов.
    const candidate = sequenceRef.current.slice(-codeLength);

    sequenceRef.current = '';
    verificationInProgressRef.current = true;

    void invoke<boolean>('verify_access_code', {
      code: candidate,
    })
      .then((isValid) => {
        if (isValid) {
          setSettingsUnlocked((current) => !current);
        }
      })
      .catch((error: unknown) => {
        console.error('Failed to verify access code:', error);
      })
      .finally(() => {
        verificationInProgressRef.current = false;
      });
  }, []);

  return {
    settingsUnlocked,
    trackAccessKey,
    resetAccessSequence,
    refreshAccessCodeLength,
  };
};