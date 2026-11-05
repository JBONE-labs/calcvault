import type { SettingsFooterProps } from '../types/calculator.types';

const SettingsFooter = ({
  buttonText,
  onBack,
}: SettingsFooterProps) => {
  return (
    <footer className="settings-footer">
      <button
        type="button"
        className="settings-close"
        onClick={onBack}
      >
        {buttonText}
      </button>
    </footer>
  );
};

export default SettingsFooter;