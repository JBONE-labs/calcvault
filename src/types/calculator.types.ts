import type { SyntheticEvent } from 'react';

export type Operator = '+' | '-' | '×' | '÷';

export type CalculatorKey =
  | 'C' | '±' | '%' | '.'
  | '=' | Operator
  | '0' | '1' | '2' | '3' | '4'
  | '5' | '6' | '7' | '8' | '9';

export type CalculatorTheme = 'android' | 'ios';

export type SettingsSection = 'main' | 'access-code';

export type AccessCodeScreenProps = {
  theme: CalculatorTheme;
  onBack: () => void;
  onAccessCodeChanged: () => Promise<void>;
};

export type SettingsScreenProps = {
  theme: CalculatorTheme;
  onThemeChange: (theme: CalculatorTheme) => void;
  onBack: () => void;
  onAccessCodeChanged: () => Promise<void>;
}

export type AccessCodeInputProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  isVisible: boolean;
  onToggleVisibility: () => void;
  autoComplete: string;
  disabled: boolean;
}

export type AccessCodeFormProps = {
  currentCode: string;
  newCode: string;
  confirmCode: string;

  onCurrentCodeChange: (value: string) => void;
  onNewCodeChange: (value: string) => void;
  onConfirmCodeChange: (value: string) => void;

  showCurrentCode: boolean;
  showNewCode: boolean;
  showConfirmCode: boolean;

  onToggleCurrentCode: () => void;
  onToggleNewCode: () => void;
  onToggleConfirmCode: () => void;

  isSaving: boolean;
  onSubmit: (event: SyntheticEvent<HTMLFormElement>) => void;
}

export type CalculatorScreenProps = {
  display: string;
  theme: CalculatorTheme;
  settingsUnlocked: boolean;
  onPress: (key: CalculatorKey) => void;
  onOpenSettings: () => void;
}

export type SettingsFooterProps = {
  buttonText: string;
  onBack: () => void;
}