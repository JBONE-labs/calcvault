/* Отображает калькулятор: дисплей, клавиатуру, кнопки и кнопку Settings. Передаёт нажатия в press, полученный от App.tsx. Не выполняет вычисления самостоятельно. */

import type {
  CalculatorKey,
  CalculatorTheme,
} from '../types/calculator.types';

const KEYS: CalculatorKey[] = [
  'C', '±', '%', '÷',
  '7', '8', '9', '×',
  '4', '5', '6', '-',
  '1', '2', '3', '+',
  '0', '.', '=',
];

interface CalculatorScreenProps {
  display: string;
  theme: CalculatorTheme;
  settingsUnlocked: boolean;
  onPress: (key: CalculatorKey) => void;
  onOpenSettings: () => void;
}

const CalculatorScreen = ({
  display,
  theme,
  settingsUnlocked,
  onPress,
  onOpenSettings,
}: CalculatorScreenProps) => {
  return (
    <main className="calculator" data-theme={theme}>
      <div className="display-container">
        {settingsUnlocked && (
          <button
            type="button"
            className="settings-button"
            onClick={onOpenSettings}
          >
            Settings
          </button>
        )}

        <div className="display">{display}</div>
      </div>

      <section className="keypad" aria-label="Калькулятор">
        {KEYS.map((key) => (
          <button
            key={key}
            className={[
              'key',
              ['C', '±', '%'].includes(key) ? 'function' : '',
              ['÷', '×', '-', '+'].includes(key) ? 'operator' : '',
              key === '=' ? 'equals' : '',
              key === '0' ? 'zero' : '',
            ].filter(Boolean).join(' ')}
            onClick={() => onPress(key)}
          >
            {key}
          </button>
        ))}
      </section>
    </main>
  );
};

export default CalculatorScreen;