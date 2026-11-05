
/* управляет состоянием экрана и вызывает Rust-команды. */

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
  const [savingAction, setSavingAction] = useState<'change' | 'reset' | null>(
    null,
  );

  const [currentCode, setCurrentCode] = useState('');
  const [newCode, setNewCode] = useState('');
  const [confirmCode, setConfirmCode] = useState('');

  const [showCurrentCode, setShowCurrentCode] = useState(false);
  const [showNewCode, setShowNewCode] = useState(false);
  const [showConfirmCode, setShowConfirmCode] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Clear messages when any form field changes.
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

  // Change access code.
  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (!currentCode || !newCode || !confirmCode) {
      setError('Please fill in all fields.');
      return;
    }

    if (!isValidAccessCode(newCode)) {
      setError(
        'The new code must contain 5–64 characters. Allowed characters: digits and . + - * / % =',
      );
      return;
    }

    if (newCode !== confirmCode) {
      setError('The new code and confirmation do not match.');
      return;
    }

    setIsSaving(true);
    setSavingAction('change');

    // First: change the code in Rust.
    try {
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
      setSavingAction(null);
      return;
    }

    // Rust successfully changed the code.
    setCurrentCode('');
    setNewCode('');
    setConfirmCode('');

    // Second: refresh application state.
    try {
      await onAccessCodeChanged();

      setSuccess('Access code successfully changed.');
    } catch {
      setError(
        'Access code was changed, but the application failed to refresh its state.',
      );
    } finally {
      setIsSaving(false);
      setSavingAction(null);
    }
  };

  // Reset access code.
  const handleReset = async () => {
    setError('');
    setSuccess('');

    setIsSaving(true);
    setSavingAction('reset');

    // First: reset the code in Rust.
    try {
      await invoke<number>('reset_access_code');
    } catch (err) {
      setError(
        typeof err === 'string'
          ? err
          : 'Failed to reset access code.',
      );

      setIsSaving(false);
      setSavingAction(null);
      return;
    }

    // Rust successfully reset the code.
    setCurrentCode('');
    setNewCode('');
    setConfirmCode('');

    // Second: refresh application state.
    try {
      await onAccessCodeChanged();

      setSuccess('Access code successfully reset to default (123+=).');
    } catch {
      setError(
        'Access code was reset, but the application failed to refresh its state.',
      );
    } finally {
      setIsSaving(false);
      setSavingAction(null);
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

        <div className="access-code-reset">
          <p className="access-code-hint">
            Forgot access code? Reset it to the default code: 123+=.
            <br />
            No current code is required.
          </p>

          <button
            type="button"
            className="access-code-reset-button"
            onClick={handleReset}
            disabled={isSaving}
          >
            {isSaving && savingAction === 'reset'
              ? 'Resetting...'
              : 'Reset to Default'}
          </button>
        </div>
      </section>

      <SettingsFooter
        buttonText="Back to Settings"
        onBack={onBack}
      />
    </main>
  );
};

export default AccessCodeScreen;
