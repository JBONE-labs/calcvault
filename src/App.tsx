/* App.tsx - Хранит выбранную тему (theme), управляет открытием Settings (settingsOpen), вызывает useCalculator() и выбирает, какой экран отобразить. */

import { useEffect, useState } from 'react';
import { useCalculator } from './hooks/useCalculator';
import CalculatorScreen from './components/CalculatorScreen';
import SettingsScreen from './components/SettingsScreen';
import type { CalculatorTheme } from './types/calculator.types';
import './App.css';

const THEME_STORAGE_KEY = 'calcvault.theme';

// Загружает ранее сохранённую тему.
const getInitialTheme = (): CalculatorTheme => {
  if (typeof window === 'undefined') {
    return 'android';
  }

  try {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

    if (savedTheme === 'android' || savedTheme === 'ios') {
      return savedTheme;
    }
  } catch (error) {
    console.error('Failed to load saved theme:', error);
  }

  return 'android';
};

const App = () => {
  const [theme, setTheme] = useState<CalculatorTheme>(getInitialTheme);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const {
    display,
    press,
    settingsUnlocked,
    refreshAccessCodeLength,
  } = useCalculator();

  // Сохраняем тему при каждом её изменении.
  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      console.error('Failed to save selected theme:', error);
    }
  }, [theme]);

  // Показываем настройки только после ввода правильного кода.
  if (settingsUnlocked && settingsOpen) {
    return (
      <SettingsScreen
        theme={theme}
        onThemeChange={setTheme}
        onBack={() => setSettingsOpen(false)}
        onAccessCodeChanged={refreshAccessCodeLength}
      />
    );
  }

  return (
    <CalculatorScreen
      display={display}
      theme={theme}
      settingsUnlocked={settingsUnlocked}
      onPress={press}
      onOpenSettings={() => setSettingsOpen(true)}
    />
  );
};

export default App;