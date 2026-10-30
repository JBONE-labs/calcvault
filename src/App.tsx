/* App.tsx - Хранит выбранную тему (theme), управляет открытием Settings (settingsOpen), вызывает useCalculator() и выбирает, какой экран отобразить. */

import { useState } from 'react';
import { useCalculator } from './hooks/useCalculator';
import CalculatorScreen from './components/CalculatorScreen';
import SettingsScreen from './components/SettingsScreen';
import type { CalculatorTheme } from './types/calculator.types';
import './App.css';

const App = () => {
  const [theme, setTheme] = useState<CalculatorTheme>('android');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const {
    display,
    press,
    settingsUnlocked,
    refreshAccessCodeLength,
  } = useCalculator();

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