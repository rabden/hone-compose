"use client";

import React from 'react';
import '@material/web/ripple/ripple.js';

interface RippleProps extends React.HTMLAttributes<HTMLElement> {
    disabled?: boolean;
    htmlFor?: string;
    unbounded?: boolean;
    className?: string;
}

export const Ripple = React.forwardRef<HTMLElement, RippleProps>(({
    disabled,
    htmlFor,
    unbounded,
    className,
    ...props
}, ref) => {
    return (
        // @ts-ignore - md-ripple is a custom element
        <md-ripple
            ref={ref as any}
            disabled={disabled}
            for={htmlFor}
            unbounded={unbounded}
            className={className}
            suppressHydrationWarning
            {...props}
        />
    );
});

Ripple.displayName = 'Ripple';
