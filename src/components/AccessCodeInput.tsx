import type { ChangeEvent } from 'react';
import eyeIcon from '../assets/icons/eyeOpen.svg';
import eyeOffIcon from '../assets/icons/eyeClose.svg';
import type { AccessCodeInputProps } from '../types/calculator.types';

const AccessCodeInput = ({
  id,
  label,
  value,
  onChange,
  isVisible,
  onToggleVisibility,
  autoComplete,
  disabled,
}: AccessCodeInputProps) => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  return (
    <label className="access-code-field" htmlFor={id}>
      <span>{label}</span>

      <div className="access-code-input-wrapper">
        <input
          id={id}
          type={isVisible ? 'text' : 'password'}
          value={value}
          onChange={handleChange}
          autoComplete={autoComplete}
          maxLength={64}
          disabled={disabled}
          required
        />

        <button
          type="button"
          className="access-code-visibility"
          onClick={onToggleVisibility}
          aria-label={isVisible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={isVisible}
          disabled={disabled}
        >
          <img
            className="access-code-visibility-icon"
            src={isVisible ? eyeIcon : eyeOffIcon}
            alt=""
            aria-hidden="true"
          />
        </button>
      </div>
    </label>
  );
};

export default AccessCodeInput;
