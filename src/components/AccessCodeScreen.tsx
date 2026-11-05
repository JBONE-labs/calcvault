/* Управляет экраном смены кода доступа. */

import { useState } from 'react';
import type { SyntheticEvent } from 'react';
import { invoke } from '@tauri-apps/api/core';

import AccessCodeForm from './AccessCodeForm';
import SettingsFooter from './SettingsFooter';

import type { AccessCodeScreenProps } from '../types/calculator.types';
import { isValidAccessCode } from '../utils/accessCode.utils';

const AccessCodeScreen = ({
  theme,
  onBack,
  onAccessCodeChanged,
}: AccessCodeScreenProps) => {
  const [isSaving, setIsSaving] = useState(false);

  const [currentCode, setCurrentCode] = useState('');
  const [newCode, setNewCode] = useState('');
  const [confirmCode, setConfirmCode] = useState('');

  const [showCurrentCode, setShowCurrentCode] = useState(false);
  const [showNewCode, setShowNewCode] = useState(false);
  const [showConfirmCode, setShowConfirmCode] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Очищаем сообщения при изменении полей.
  const handleCurrentCodeChange = (value: string) => {
    setCurrentCode(value);
    setError('');
    setSuccess('');
  };

  const handleNewCodeChange = (value: string) => {
    setNewCode(value);
    setError('');
    setSuccess('');
  };

  const handleConfirmCodeChange = (value: string) => {
    setConfirmCode(value);
    setError('');
    setSuccess('');
  };

  // Смена кода доступа.
  const handleSubmit = async (
    event: SyntheticEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (!currentCode || !newCode || !confirmCode) {
      setError('Please fill in all fields.');
      return;
    }

    if (!isValidAccessCode(newCode)) {
      setError(
        'The new code must contain 5–64 characters. Allowed characters: digits and . + - * / % =. The Factory Reset sequence 123777 is reserved.',
      );
      return;
    }

    if (newCode !== confirmCode) {
      setError('The new code and confirmation do not match.');
      return;
    }

    setIsSaving(true);

    try {
      // Rust самостоятельно проверяет текущий код
      // и только после этого сохраняет новый.
      await invoke<number>('change_access_code', {
        currentCode,
        newCode,
      });
    } catch (err) {
      setError(
        typeof err === 'string'
          ? err
          : 'Failed to change access code. Please check your current code.',
      );

      setIsSaving(false);
      return;
    }

    setCurrentCode('');
    setNewCode('');
    setConfirmCode('');

    try {
      await onAccessCodeChanged();

      setSuccess('Access code successfully changed.');
    } catch {
      setError(
        'Access code was changed, but the application failed to refresh its state.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="settings-screen" data-theme={theme}>
      <header className="settings-header">
        <h1>Access Code</h1>
      </header>

      <section
        className="settings-content access-code-content"
        aria-label="Access code settings"
      >
        <p className="access-code-hint">
          Enter your current code and choose a new code between 5 and 64
          characters.
          <br />
          Allowed characters: digits and . + - * / % =
        </p>

        <AccessCodeForm
          currentCode={currentCode}
          newCode={newCode}
          confirmCode={confirmCode}
          onCurrentCodeChange={handleCurrentCodeChange}
          onNewCodeChange={handleNewCodeChange}
          onConfirmCodeChange={handleConfirmCodeChange}
          showCurrentCode={showCurrentCode}
          showNewCode={showNewCode}
          showConfirmCode={showConfirmCode}
          onToggleCurrentCode={() =>
            setShowCurrentCode((value) => !value)
          }
          onToggleNewCode={() =>
            setShowNewCode((value) => !value)
          }
          onToggleConfirmCode={() =>
            setShowConfirmCode((value) => !value)
          }
          isSaving={isSaving}
          onSubmit={handleSubmit}
        />

        {error && (
          <p className="access-code-error" role="alert">
            {error}
          </p>
        )}

        {success && (
          <p className="access-code-success" role="status">
            {success}
          </p>
        )}

        <section className="access-code-reset">
          <h2>Factory Reset</h2>

          <p className="access-code-hint">
            If you forget your access code, enter 123777 on the calculator
            screen. The application will immediately return to its initial
            state and permanently delete all application data, including
            accounts, encryption keys, settings, databases and user files.
            <br />
            The default access code will be restored to 123+=.
          </p>
        </section>
      </section>

      <SettingsFooter
        buttonText="Back to Settings"
        onBack={onBack}
      />
    </main>
  );
};

export default AccessCodeScreen;