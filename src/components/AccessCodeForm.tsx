/* отображает поля и передаёт изменения значений родителю. */

import AccessCodeInput from './AccessCodeInput';
import type { AccessCodeFormProps } from '../types/calculator.types';

const AccessCodeForm = ({
  currentCode,
  newCode,
  confirmCode,

  onCurrentCodeChange,
  onNewCodeChange,
  onConfirmCodeChange,

  showCurrentCode,
  showNewCode,
  showConfirmCode,

  onToggleCurrentCode,
  onToggleNewCode,
  onToggleConfirmCode,

  isSaving,
  onSubmit,
}: AccessCodeFormProps) => {
  return (
     <form className="access-code-form" onSubmit={onSubmit}>
      <AccessCodeInput
        id="current-code"
        label="Current Code"
        value={currentCode}
        onChange={onCurrentCodeChange}
        isVisible={showCurrentCode}
        onToggleVisibility={onToggleCurrentCode}
        autoComplete="current-password"
        disabled={isSaving}
      />

      <AccessCodeInput
        id="new-code"
        label="New Code"
        value={newCode}
        onChange={onNewCodeChange}
        isVisible={showNewCode}
        onToggleVisibility={onToggleNewCode}
        autoComplete="new-password"
        disabled={isSaving}
      />

      <AccessCodeInput
        id="confirm-code"
        label="Confirm New Code"
        value={confirmCode}
        onChange={onConfirmCodeChange}
        isVisible={showConfirmCode}
        onToggleVisibility={onToggleConfirmCode}
        autoComplete="new-password"
        disabled={isSaving}
      />

      <button
        type="submit"
        className="access-code-submit"
        disabled={isSaving}
      >
        {isSaving ? 'Saving...' : 'Change Access Code'}
      </button>
    </form>
  );
};

export default AccessCodeForm;