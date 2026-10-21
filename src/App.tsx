/* Кнопки и дисплей калькулятора */

import { useState } from 'react';
import { useCalculator } from './hooks/useCalculator';
import './App.css';
import type { CalculatorKey } from './types/calculator.types';


const KEYS: CalculatorKey[] = [
  'C', '±', '%', '÷',
  '7', '8', '9', '×',
  '4', '5', '6', '-',
  '1', '2', '3', '+',
  '0', '.', '=',
];

const App = () => {
  const { display, press, settingsUnlocked } = useCalculator();
  const [settingsOpen, setSettingsOpen] = useState(false);



  return (
    <main className="calculator">
      <div className="display-container">
        {settingsUnlocked && (
          <button
            type="button"
            className="settings-button"
            onClick={() => setSettingsOpen((open) => !open)}
            aria-expanded={settingsOpen}
            aria-controls="calculator-settings"
          >
            Settings
          </button>
        )}

        <div className="display">{display}</div>
      </div>

      {settingsUnlocked && settingsOpen && (
        <section
          id="calculator-settings"
          className="settings-panel"
          aria-label="Settings"
        >
          <h2>Settings</h2>
          <p>Дополнительные настройки будут добавлены позже.</p>

          <button
            type="button"
            className="settings-close"
            onClick={() => setSettingsOpen(false)}
          >
            Close
          </button>
        </section>
      )}

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
