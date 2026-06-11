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
        <md-ripple
            ref={ref as React.Ref<HTMLElement>}
            disabled={disabled}
            for={htmlFor}
            unbounded={unbounded}
            className={className}
            suppressHydrationWarning
            style={{
                "--md-ripple-hover-color": "transparent",
                "--md-ripple-hover-opacity": "0",
                "--md-ripple-pressed-color": "currentColor",
                "--md-ripple-pressed-opacity": "0.12",
            } as React.CSSProperties}
            {...props}
        />
    );
});

Ripple.displayName = 'Ripple';
