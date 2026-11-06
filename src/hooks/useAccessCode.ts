
/* хук, который отслеживает последовательность нажатий, проверяет код доступа и управляет разблокировкой настроек и Factory Reset. */

import { useCallback, useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { CalculatorKey } from '../types/calculator.types';

const MIN_CODE_LENGTH = 5;
const MAX_CODE_LENGTH = 64;

const FACTORY_RESET_SEQUENCE = '123777';
const THEME_STORAGE_KEY = 'calcvault.theme';

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
  const factoryResetSequenceRef = useRef('');

  const verificationInProgressRef = useRef(false);
  const factoryResetInProgressRef = useRef(false);

  // Загружает актуальную длину кода из Rust.
  const refreshAccessCodeLength = useCallback(async (): Promise<void> => {
    codeLengthRef.current = null;
    sequenceRef.current = '';
    factoryResetSequenceRef.current = '';

    const length = await invoke<number>('get_access_code_length');

    if (
      !Number.isInteger(length) ||
      length < MIN_CODE_LENGTH ||
      length > MAX_CODE_LENGTH
    ) {
      throw new Error('Invalid access-code length');
    }

    codeLengthRef.current = length;
  }, []);

  // Загружает длину кода при первом запуске.
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

  // Очищает последовательности ввода.
  const resetAccessSequence = useCallback((): void => {
    sequenceRef.current = '';
    factoryResetSequenceRef.current = '';
  }, []);

  // Выполняет Factory Reset.
  const executeFactoryReset = useCallback((): void => {
    if (factoryResetInProgressRef.current) {
      return;
    }

    factoryResetInProgressRef.current = true;
    verificationInProgressRef.current = true;

    // Немедленно блокируем Settings.
    setSettingsUnlocked(false);

    // Сбрасываем все последовательности ввода.
    sequenceRef.current = '';
    factoryResetSequenceRef.current = '';

    // До завершения Rust-команды не разрешаем новые проверки.
    codeLengthRef.current = null;

    void invoke<number>('factory_reset')
      .then(() => {
        console.info('Factory Reset completed successfully.');

        // Удаляем сохранённую тему при успешном сбросе.
        try {
          window.localStorage.removeItem(THEME_STORAGE_KEY);
        } catch (error) {
          console.error('Failed to clear saved theme:', error);
        }
      })
      .catch((error: unknown) => {
        console.error('Factory Reset failed:', error);
      })
      .finally(() => {
        // Перезагружаем приложение после завершения Rust-команды.
        window.location.reload();
      });
  }, []);

  // Проверяет обычный код доступа.
  const verifyCandidate = useCallback((candidate: string): void => {
    if (
      verificationInProgressRef.current ||
      factoryResetInProgressRef.current
    ) {
      return;
    }

    verificationInProgressRef.current = true;

    void invoke<boolean>('verify_access_code', {
      code: candidate,
    })
      .then((isValid) => {
        if (isValid && !factoryResetInProgressRef.current) {
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

  // Обрабатывает нажатия клавиш калькулятора.
  const trackAccessKey = useCallback(
    (key: CalculatorKey): void => {
      if (factoryResetInProgressRef.current) {
        return;
      }

      const character = getAccessCharacter(key);

      // C и ± сбрасывают последовательности.
      if (character === null) {
        sequenceRef.current = '';
        factoryResetSequenceRef.current = '';
        return;
      }

      // Специальная последовательность проверяется независимо
      // от длины обычного пароля и состояния Settings.
      factoryResetSequenceRef.current = (
        factoryResetSequenceRef.current + character
      ).slice(-FACTORY_RESET_SEQUENCE.length);

      if (
        factoryResetSequenceRef.current === FACTORY_RESET_SEQUENCE
      ) {
        executeFactoryReset();
        return;
      }

      // Не запускаем повторную обычную проверку,
      // пока предыдущая проверка не завершилась.
      if (verificationInProgressRef.current) {
        return;
      }

      const codeLength = codeLengthRef.current;

      if (codeLength === null) {
        return;
      }

      sequenceRef.current += character;

      if (sequenceRef.current.length < codeLength) {
        return;
      }

      const candidate = sequenceRef.current.slice(-codeLength);

      sequenceRef.current = '';

      verifyCandidate(candidate);
    },
    [executeFactoryReset, verifyCandidate],
  );

  return {
    settingsUnlocked,
    trackAccessKey,
    resetAccessSequence,
    refreshAccessCodeLength,
  };
};