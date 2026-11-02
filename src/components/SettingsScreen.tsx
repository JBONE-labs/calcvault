// TODO: replace all interfaces from all components

import { useState } from 'react';
import type { CalculatorTheme, SettingsSection } from '../types/calculator.types';
import AccessCodeScreen from './AccessCodeScreen';

interface SettingsScreenProps {
  theme: CalculatorTheme;
  onThemeChange: (theme: CalculatorTheme) => void;
  onBack: () => void;
  onAccessCodeChanged: () => Promise<void>;
}


const SettingsScreen = ({
  theme,
  onThemeChange,
  onBack,
  onAccessCodeChanged,
}: SettingsScreenProps) => {
  const [section, setSection] = useState<SettingsSection>('main');

  if (section === 'access-code') {
    return (
      <AccessCodeScreen
        theme={theme}
        onBack={() => setSection('main')}
        onAccessCodeChanged={onAccessCodeChanged}
      />
    );
  }

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

        <section className="settings-section">
          <h2>Security</h2>

          <button
            type="button"
            className="settings-navigation"
            onClick={() => setSection('access-code')}
          >
            <span>Access Code</span>
            <span className="settings-navigation-arrow" aria-hidden="true">
              →
            </span>
          </button>
        </section>
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