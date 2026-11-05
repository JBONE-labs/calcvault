/* проверяет, соответствует ли новый код требованиям. */

const ACCESS_CODE_PATTERN = /^[0-9.+*/%=-]{5,64}$/;

export const isValidAccessCode = (code: string): boolean => {
  return ACCESS_CODE_PATTERN.test(code);
};
