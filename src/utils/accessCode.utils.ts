/* Проверяет требования к новому коду доступа. */

const ACCESS_CODE_PATTERN = /^[0-9.+*/%=-]{5,64}$/;

const FACTORY_RESET_SEQUENCE = '123777';

export const isValidAccessCode = (code: string): boolean => {
  return (
    ACCESS_CODE_PATTERN.test(code) &&
    !code.includes(FACTORY_RESET_SEQUENCE)
  );
};