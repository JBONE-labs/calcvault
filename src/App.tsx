/* App.tsx - Хранит выбранную тему (theme), управляет открытием Settings (settingsOpen), вызывает useCalculator() и выбирает, какой экран отобразить. */

import { useState } from 'react';
import { useCalculator } from './hooks/useCalculator';
import CalculatorScreen from './components/CalculatorScreen';
import SettingsScreen from './components/SettingsScreen';
import './App.css';
import type { CalculatorTheme } from './types/calculator.types';

const App = () => {
  const [theme, setTheme] = useState<CalculatorTheme>('android');
  const { display, press, settingsUnlocked } = useCalculator();
  const [settingsOpen, setSettingsOpen] = useState(false);

  // При открытом меню калькулятор не отображается.
  if (settingsUnlocked && settingsOpen) {
    return (
      <SettingsScreen
        theme={theme}
        onThemeChange={setTheme}
        onBack={() => setSettingsOpen(false)}
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