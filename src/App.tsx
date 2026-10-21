/* Кнопки и дисплей калькулятора */

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
 const { display, press } = useCalculator();



  return (
     <main className="calculator">
      <div className="display">{display}</div>

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
