import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 font-medium rounded-full transition-subtle',
  {
    variants: {
      variant: {
        default: 'bg-muted text-foreground',
        primary: 'bg-primary/10 text-primary border border-primary/20',
        secondary: 'bg-secondary/10 text-secondary border border-secondary/20',
        accent: 'bg-accent/10 text-accent border border-accent/20',
        success: 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300 border border-green-200/30 dark:border-green-800/30',
        warning: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-300 border border-yellow-200/30 dark:border-yellow-800/30',
        destructive: 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300 border border-red-200/30 dark:border-red-800/30',
        info: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 border border-blue-200/30 dark:border-blue-800/30',
        outline: 'bg-transparent border border-border text-foreground',
      },
      size: {
        sm: 'px-2 py-0.5 text-[10px]',
        md: 'px-2.5 py-1 text-xs',
        lg: 'px-3 py-1.5 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

const Badge = ({ className, variant, size, children, ...props }) => (
  <span className={cn(badgeVariants({ variant, size, className }))} {...props}>
    {children}
  </span>
);
Badge.displayName = 'Badge';

/* eslint-disable react-refresh/only-export-components */
export { Badge, badgeVariants };
