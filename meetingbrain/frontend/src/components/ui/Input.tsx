import { forwardRef, useState } from 'react';
import { clsx } from 'clsx';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  containerClassName?: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  containerClassName?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

// ─── Input ────────────────────────────────────────────────────────────────────
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      containerClassName,
      className,
      type = 'text',
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className={clsx('form-group', containerClassName)}>
        {label && (
          <label className="form-label">
            {label}
            {props.required && (
              <span className="text-danger-400 ml-1">*</span>
            )}
          </label>
        )}

        <div className="relative">
          {/* Left icon */}
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            type={inputType}
            className={clsx(
              'form-input',
              leftIcon && 'pl-9',
              (rightIcon || isPassword) && 'pr-9',
              error && 'border-danger-500 focus:ring-danger-500',
              className
            )}
            {...props}
          />

          {/* Right icon or password toggle */}
          {isPassword ? (
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400
                         hover:text-slate-200 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          ) : rightIcon ? (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              {rightIcon}
            </div>
          ) : null}
        </div>

        {/* Error message */}
        {error && (
          <p className="form-error">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {error}
          </p>
        )}

        {/* Hint */}
        {hint && !error && (
          <p className="form-hint">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// ─── Textarea ─────────────────────────────────────────────────────────────────
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, containerClassName, className, ...props }, ref) => {
    return (
      <div className={clsx('form-group', containerClassName)}>
        {label && (
          <label className="form-label">
            {label}
            {props.required && <span className="text-danger-400 ml-1">*</span>}
          </label>
        )}

        <textarea
          ref={ref}
          className={clsx(
            'form-textarea',
            error && 'border-danger-500 focus:ring-danger-500',
            className
          )}
          {...props}
        />

        {error && (
          <p className="form-error">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {error}
          </p>
        )}

        {hint && !error && <p className="form-hint">{hint}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

// ─── Select ───────────────────────────────────────────────────────────────────
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      hint,
      containerClassName,
      className,
      options,
      placeholder,
      ...props
    },
    ref
  ) => {
    return (
      <div className={clsx('form-group', containerClassName)}>
        {label && (
          <label className="form-label">
            {label}
            {props.required && <span className="text-danger-400 ml-1">*</span>}
          </label>
        )}

        <select
          ref={ref}
          className={clsx(
            'form-select',
            error && 'border-danger-500 focus:ring-danger-500',
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {error && (
          <p className="form-error">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {error}
          </p>
        )}

        {hint && !error && <p className="form-hint">{hint}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Input;