import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

const Textarea = forwardRef(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const errorId = `${textareaId}-error`;
    const hintId = `${textareaId}-hint`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-xs font-medium text-foreground/80 mb-1.5"
          >
            {label}
            {props.required && <span className="text-destructive ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            'w-full px-3 py-2.5 text-sm text-foreground bg-background border rounded-md',
            'placeholder:text-muted-foreground/60',
            'focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20',
            'disabled:bg-muted disabled:cursor-not-allowed',
            'transition-subtle resize-y min-h-[80px]',
            error && 'border-destructive focus:border-destructive focus:ring-destructive/20',
            className
          )}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          {...props}
        />
        {error && (
          <p id={errorId} className="mt-1.5 text-xs font-medium text-destructive" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="mt-1.5 text-xs text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
