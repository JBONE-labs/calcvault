/* Отображает калькулятор: дисплей, клавиатуру, кнопки и кнопку Settings. Передаёт нажатия в press, полученный от App.tsx. Не выполняет вычисления самостоятельно. */

import type {
  CalculatorKey,
  CalculatorScreenProps
} from '../types/calculator.types';

const KEYS: CalculatorKey[] = [
  'C', '±', '%', '÷',
  '7', '8', '9', '×',
  '4', '5', '6', '-',
  '1', '2', '3', '+',
  '0', '.', '=',
];

const getKeyClassName = (key: CalculatorKey): string => {
  const classes = ['key'];

  if (['C', '±', '%'].includes(key)) {
    classes.push('function');
  }

  if (['÷', '×', '-', '+'].includes(key)) {
    classes.push('operator');
  }

  if (key === '=') {
    classes.push('equals');
  }

  if (key === '0') {
    classes.push('zero');
  }

  return classes.join(' ');
};

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
            className={getKeyClassName(key)}
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