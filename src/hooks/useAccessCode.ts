/* хук, который отслеживает последовательность нажатий, проверяет введённый код доступа и управляет состоянием разблокировки настроек либо возвратом к дефолтному состоянию. */

import { useCallback, useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { CalculatorKey } from '../types/calculator.types';

const MIN_CODE_LENGTH = 5;
const MAX_CODE_LENGTH = 64;

const FACTORY_RESET_SEQUENCE = '123777';

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

  // Последовательность для обычной проверки пароля.
  const sequenceRef = useRef('');

  // Отдельная последовательность для Factory Reset.
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

  // Очищает последовательности ввода.
  const resetAccessSequence = useCallback((): void => {
    sequenceRef.current = '';
    factoryResetSequenceRef.current = '';
  }, []);

  // Выполняет полный Factory Reset одной Rust-командой.
  const executeFactoryReset = useCallback((): void => {
    if (factoryResetInProgressRef.current) {
      return;
    }

    factoryResetInProgressRef.current = true;

    sequenceRef.current = '';
    factoryResetSequenceRef.current = '';

    verificationInProgressRef.current = true;

    void invoke<number>('factory_reset')
      .then(() => {
        // После успешного сброса приложение запускается заново.
        // Начальное состояние и заблокированные настройки
        // восстанавливаются при повторной инициализации React.
        window.location.reload();
      })
      .catch((error: unknown) => {
        console.error('Factory Reset failed:', error);

        // При ошибке разрешаем повторную попытку.
        factoryResetInProgressRef.current = false;
        verificationInProgressRef.current = false;

        sequenceRef.current = '';
        factoryResetSequenceRef.current = '';
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
        // Не меняем состояние интерфейса, если уже начался Factory Reset.
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

  // Обрабатывает каждое нажатие клавиши калькулятора.
  const trackAccessKey = useCallback(
    (key: CalculatorKey): void => {
      if (factoryResetInProgressRef.current) {
        return;
      }

      const character = getAccessCharacter(key);

      // C и ± сбрасывают обе последовательности.
      if (character === null) {
        sequenceRef.current = '';
        factoryResetSequenceRef.current = '';
        return;
      }

      // Сначала проверяем специальную последовательность Factory Reset.
      // Она работает независимо от длины обычного пароля и состояния
      // текущей проверки пароля.
      factoryResetSequenceRef.current = (
        factoryResetSequenceRef.current + character
      ).slice(-FACTORY_RESET_SEQUENCE.length);

      if (
        factoryResetSequenceRef.current === FACTORY_RESET_SEQUENCE
      ) {
        executeFactoryReset();
        return;
      }

      // Если уже проверяется обычный пароль, не запускаем вторую проверку.
      // Проверка Factory Reset выше всё равно продолжает работать.
      if (verificationInProgressRef.current) {
        return;
      }

      const codeLength = codeLengthRef.current;

      // Обычный пароль проверяем только после загрузки его длины.
      if (codeLength === null) {
        return;
      }

      sequenceRef.current += character;

      if (sequenceRef.current.length < codeLength) {
        return;
      }

      // Проверяем последние N символов.
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