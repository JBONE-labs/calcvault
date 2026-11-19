import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import type { CalculatorKey } from '../../types/calculator.types';
import { useAccessCode } from '../useAccessCode';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

const flushInitialCodeLength = async (): Promise<void> => {
  await waitFor(() => {
    expect(invoke).toHaveBeenCalledWith('get_access_code_length');
  });

  await act(async () => {
    await Promise.resolve();
  });
};

const enterKeys = (
  trackAccessKey: (key: CalculatorKey) => void,
  keys: CalculatorKey[],
): void => {
  act(() => {
    keys.forEach(trackAccessKey);
  });
};

describe('useAccessCode', () => {
  beforeEach(() => {
    vi.mocked(invoke).mockImplementation((async (command: string) => {
      if (command === 'get_access_code_length') {
        return 5;
      }

      if (command === 'verify_access_code') {
        return true;
      }

      return 0;
    }) as typeof invoke);
  });

  it('проверяет код после набора символов нужной длины', async () => {
    const { result } = renderHook(() => useAccessCode());

    await flushInitialCodeLength();

    enterKeys(result.current.trackAccessKey, ['1', '2', '+', '.', '=']);

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('verify_access_code', {
        code: '12+.=',
      });
    });

    await waitFor(() => {
      expect(result.current.settingsUnlocked).toBe(true);
    });
  });

  it('преобразует знаки умножения и деления в символы кода', async () => {
    const { result } = renderHook(() => useAccessCode());

    await flushInitialCodeLength();

    enterKeys(result.current.trackAccessKey, ['1', '2', '×', '÷', '=']);

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('verify_access_code', {
        code: '12*/=',
      });
    });
  });

  it('не разблокирует настройки при неверном коде', async () => {
    vi.mocked(invoke).mockImplementation((async (command: string) => {
      if (command === 'get_access_code_length') {
        return 5;
      }

      if (command === 'verify_access_code') {
        return false;
      }

      return 0;
    }) as typeof invoke);

    const { result } = renderHook(() => useAccessCode());

    await flushInitialCodeLength();

    enterKeys(result.current.trackAccessKey, ['1', '2', '+', '.', '=']);

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('verify_access_code', {
        code: '12+.=',
      });
    });

    expect(result.current.settingsUnlocked).toBe(false);
  });
});