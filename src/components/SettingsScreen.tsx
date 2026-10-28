/* Отображает настройки: переключение между Android Theme и iOS Theme, а также кнопку возврата к калькулятору. Получает тему и обработчики от App.tsx */

import type { CalculatorTheme } from '../types/calculator.types';

interface SettingsScreenProps {
  theme: CalculatorTheme;
  onThemeChange: (theme: CalculatorTheme) => void;
  onBack: () => void;
}

const SettingsScreen = ({
  theme,
  onThemeChange,
  onBack,
}: SettingsScreenProps) => {
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
              onChange={() => onThemeChange('android')}
            />
          </label>

          <label className="theme-option">
            <span>iOS Theme</span>
            <input
              type="radio"
              name="calculator-theme"
              value="ios"
              checked={theme === 'ios'}
              onChange={() => onThemeChange('ios')}
            />
          </label>
        </fieldset>
      </section>

      <footer className="settings-footer">
        <button
          type="button"
          className="settings-close"
          onClick={onBack}
        >
          Back to calculator
        </button>
      </footer>
    </main>
  );
};

export default SettingsScreen;