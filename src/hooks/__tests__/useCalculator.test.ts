import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import type { CalculatorKey } from '../../types/calculator.types';
import { useCalculator } from '../useCalculator';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

const pressKeys = (
  getPress: () => (key: CalculatorKey) => void,
  keys: CalculatorKey[],
): void => {
  keys.forEach((key) => {
    act(() => {
      getPress()(key);
    });
  });
};

describe('useCalculator', () => {
  beforeEach(() => {
    vi.mocked(invoke).mockResolvedValue(5 as never);
  });

  it('выполняет сложение', () => {
    const { result } = renderHook(() => useCalculator());

    pressKeys(() => result.current.press, ['2', '+', '3', '=']);

    expect(result.current.display).toBe('5');
  });

  it('показывает сообщение при делении на ноль', () => {
    const { result } = renderHook(() => useCalculator());

    pressKeys(() => result.current.press, ['8', '÷', '0', '=']);

    expect(result.current.display).toBe("Can't divide by 0");
  });

  it('сбрасывает состояние по кнопке C', () => {
    const { result } = renderHook(() => useCalculator());

    pressKeys(() => result.current.press, ['8', '+', '2', 'C']);

    expect(result.current.display).toBe('0');

    pressKeys(() => result.current.press, ['=']);

    expect(result.current.display).toBe('0');
  });

  it('преобразует процент в значение, делённое на 100', () => {
    const { result } = renderHook(() => useCalculator());

    pressKeys(() => result.current.press, ['5', '0', '%']);

    expect(result.current.display).toBe('0.5');
  });

  it('не позволяет вводить больше 12 цифр', () => {
    const { result } = renderHook(() => useCalculator());

    pressKeys(() => result.current.press, [
      '1', '2', '3', '4', '5', '6',
      '7', '8', '9', '0', '1', '2', '3',
    ]);

    expect(result.current.display).toBe('123456789012');
  });
});