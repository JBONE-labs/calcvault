/* Основной экран калькулятора и полноэкранное меню настроек */

import { useState } from 'react';
import { useCalculator } from './hooks/useCalculator';
import './App.css';
import type { CalculatorKey, CalculatorTheme } from './types/calculator.types';

const KEYS: CalculatorKey[] = [
  'C', '±', '%', '÷',
  '7', '8', '9', '×',
  '4', '5', '6', '-',
  '1', '2', '3', '+',
  '0', '.', '=',
];

const App = () => {
  const [theme, setTheme] = useState<CalculatorTheme>('android');
  const { display, press, settingsUnlocked } = useCalculator();
  const [settingsOpen, setSettingsOpen] = useState(false);

  // При открытом меню калькулятор не отображается.
  if (settingsUnlocked && settingsOpen) {
    return (
      <main className="settings-screen" data-theme={theme}>
        <header className="settings-header">
          <h1>Settings</h1>
        </header>

        <section
          className="settings-content"
          aria-label="Настройки приложения"
        >
          <fieldset className="theme-settings">
            <legend>Theme</legend>

            <label className="theme-option">
              <span>Android Theme</span>
              <input
                type="radio"
                name="calculator-theme"
                value="android"
                checked={theme === 'android'}
                onChange={() => setTheme('android')}
              />
            </label>

            <label className="theme-option">
              <span>iOS Theme</span>
              <input
                type="radio"
                name="calculator-theme"
                value="ios"
                checked={theme === 'ios'}
                onChange={() => setTheme('ios')}
              />
            </label>
          </fieldset>
        </section>

        <footer className="settings-footer">
          <button
            type="button"
            className="settings-close"
            onClick={() => setSettingsOpen(false)}
          >
            Back to calculator
          </button>
        </footer>
      </main>
    );
  }

  return (
    <main className="calculator" data-theme={theme}>
      <div className="display-container">
        {settingsUnlocked && (
          <button
            type="button"
            className="settings-button"
            onClick={() => setSettingsOpen(true)}
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
            onClick={() => press(key)}
          >
            {key}
          </button>
        ))}
      </section>
    </main>
  );
};

export default App;
