import { describe, expect, it } from 'vitest';
import { isValidAccessCode } from '../accessCode.utils';

describe('isValidAccessCode', () => {
  it('принимает код минимальной допустимой длины', () => {
    expect(isValidAccessCode('123+=')).toBe(true);
  });

  it('принимает код максимальной допустимой длины', () => {
    expect(isValidAccessCode('1'.repeat(64))).toBe(true);
  });

  it('принимает разрешённые цифры и операторы', () => {
    expect(isValidAccessCode('12.+-*/%=')).toBe(true);
  });

  it('отклоняет код короче 5 символов', () => {
    expect(isValidAccessCode('1234')).toBe(false);
  });

  it('отклоняет код длиннее 64 символов', () => {
    expect(isValidAccessCode('1'.repeat(65))).toBe(false);
  });

  it('отклоняет код с символами вне разрешённого набора', () => {
    expect(isValidAccessCode('12ab3')).toBe(false);
    expect(isValidAccessCode('12 34')).toBe(false);
  });

  it('отклоняет зарезервированную последовательность Factory Reset', () => {
    expect(isValidAccessCode('123777')).toBe(false);
    expect(isValidAccessCode('991237771')).toBe(false);
  });
});