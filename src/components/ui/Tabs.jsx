import React, { forwardRef, useState } from 'react';
import { cn } from '../../lib/utils';


const Tabs = forwardRef(
  ({ className, defaultValue, value, onChange, orientation = 'horizontal', children, ...props }, ref) => {
    const [activeTab, setActiveTab] = useState(value || defaultValue);

    const handleTabChange = (tabValue) => {
      setActiveTab(tabValue);
      onChange?.(tabValue);
    };

    return (
      <div ref={ref} className={cn('flex', orientation === 'vertical' ? 'flex-col' : '', className)} {...props}>
        {React.Children.map(children, (child) => {
          if (!React.isValidElement(child)) return child;
          return React.cloneElement(child, {
            activeTab,
            onTabChange: handleTabChange,
            orientation,
          });
        })}
      </div>
    );
  }
);

const TabsList = ({ className, children, ...props }) => (
  <div
    className={cn(
      'inline-flex items-center bg-muted rounded-md p-1',
      'aria-orientation: horizontal',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

const TabsTrigger = forwardRef(
  ({ className, value, activeTab, onTabChange, orientation = 'horizontal', disabled, children, ...props }, ref) => {
    const isActive = activeTab === value;

    return (
      <button
        ref={ref}
        role="tab"
        aria-selected={isActive}
        aria-controls={`panel-${value}`}
        id={`tab-${value}`}
        onClick={() => !disabled && onTabChange(value)}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium text-sm',
          'rounded-md transition-subtle focus-ring',
          'whitespace-nowrap',
          isActive
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
          disabled && 'opacity-50 cursor-not-allowed',
          orientation === 'vertical' ? 'w-full justify-start px-3 py-2' : 'px-3 py-1.5',
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

const TabsContent = forwardRef(
  ({ className, value, activeTab, children, ...props }, ref) => {
    if (activeTab !== value) return null;

    return (
      <div
        ref={ref}
        id={`panel-${value}`}
        role="tabpanel"
        aria-labelledby={`tab-${value}`}
        className={cn('mt-4 animate-fade-in', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Tabs.displayName = 'Tabs';
TabsList.displayName = 'TabsList';
TabsTrigger.displayName = 'TabsTrigger';
TabsContent.displayName = 'TabsContent';

export { Tabs, TabsList, TabsTrigger, TabsContent };
