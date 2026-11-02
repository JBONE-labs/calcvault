import { useState } from 'react';
import type { SyntheticEvent } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface AccessCodeScreenProps {
  theme: 'android' | 'ios';
  onBack: () => void;
}

const AccessCodeScreen = ({
  theme,
  onBack,
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

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (!currentCode || !newCode || !confirmCode) {
      setError('Please fill in all fields.');
      return;
    }

    const allowedCodePattern = /^[0-9.+*/%=-]{5,64}$/;

    if (!allowedCodePattern.test(newCode)) {
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

    try {
      await invoke<number>('change_access_code', {
        currentCode,
        newCode,
      });

      setCurrentCode('');
      setNewCode('');
      setConfirmCode('');
      setSuccess('Access code successfully changed.');
    } catch (err) {
      setError(
        typeof err === 'string'
          ? err
          : 'Failed to change access code. Please check your current code.',
      );
    } finally {
      setIsSaving(false);
      setSavingAction(null);
    }
  };

  const handleReset = async () => {
    setError('');
    setSuccess('');

    setIsSaving(true);
    setSavingAction('reset');

    try {
      await invoke<number>('reset_access_code');

      setCurrentCode('');
      setNewCode('');
      setConfirmCode('');

      setSuccess('Access code successfully reset to default (123+=).');
    } catch (err) {
      setError(
        typeof err === 'string'
          ? err
          : 'Failed to reset access code.',
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

        <form className="access-code-form" onSubmit={handleSubmit}>
          <label className="access-code-field">
            <span>Current Code</span>
            <span className="access-code-input-wrapper">
              <input
                type={showCurrentCode ? 'text' : 'password'}
                value={currentCode}
                onChange={(event) => setCurrentCode(event.target.value)}
                autoComplete="current-password"
                maxLength={64}
                disabled={isSaving}
                required
              />
              <button
                type="button"
                className="access-code-visibility"
                onClick={() => setShowCurrentCode((visible) => !visible)}
                aria-label={showCurrentCode ? 'Hide current code' : 'Show current code'}
                aria-pressed={showCurrentCode}
                disabled={isSaving}
              >
                {showCurrentCode ? 'Hide' : 'Show'}
              </button>
            </span>
          </label>

          <label className="access-code-field">
            <span>New Code</span>
            <span className="access-code-input-wrapper">
              <input
                type={showNewCode ? 'text' : 'password'}
                value={newCode}
                onChange={(event) => setNewCode(event.target.value)}
                autoComplete="new-password"
                maxLength={64}
                disabled={isSaving}
                required
              />
              <button
                type="button"
                className="access-code-visibility"
                onClick={() => setShowNewCode((visible) => !visible)}
                aria-label={showNewCode ? 'Hide new code' : 'Show new code'}
                aria-pressed={showNewCode}
                disabled={isSaving}
              >
                {showNewCode ? 'Hide' : 'Show'}
              </button>
            </span>
          </label>

          <label className="access-code-field">
            <span>Confirm New Code</span>
            <span className="access-code-input-wrapper">
              <input
                type={showConfirmCode ? 'text' : 'password'}
                value={confirmCode}
                onChange={(event) => setConfirmCode(event.target.value)}
                autoComplete="new-password"
                maxLength={64}
                disabled={isSaving}
                required
              />
              <button
                type="button"
                className="access-code-visibility"
                onClick={() => setShowConfirmCode((visible) => !visible)}
                aria-label={showConfirmCode ? 'Hide confirmation code' : 'Show confirmation code'}
                aria-pressed={showConfirmCode}
                disabled={isSaving}
              >
                {showConfirmCode ? 'Hide' : 'Show'}
              </button>
            </span>
          </label>

          <button
            type="submit"
            className="access-code-submit"
            disabled={isSaving}
          >
            {isSaving && savingAction === 'change'
              ? 'Saving...'
              : 'Change Access Code'}
          </button>
        </form>

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

      <footer className="settings-footer">
        <button
          type="button"
          className="settings-close"
          onClick={onBack}
        >
          Back to Settings
        </button>
      </footer>
    </main>
  );
};

export default AccessCodeScreen;
