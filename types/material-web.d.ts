// Centralized Type Declarations for Material Web Components
// This file provides global JSX IntrinsicElements declarations for all Material Web 3 components
// used in this project. Each component file also has its own declarations for redundancy.

import React from 'react';

// Button Types
type MdButtonProps = React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
    disabled?: boolean;
    href?: string;
    target?: string;
    type?: 'button' | 'submit' | 'reset';
    'trailing-icon'?: boolean;
    'has-icon'?: boolean;
    form?: string;
    name?: string;
    value?: string;
};

// Dialog Types
type MdDialogProps = React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
    open?: boolean;
    quick?: boolean;
    'no-focus-trap'?: boolean;
    returnValue?: string;
    type?: 'alert' | 'confirm';
};

// Switch Types
type MdSwitchProps = React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
    selected?: boolean;
    icons?: boolean;
    showOnlySelectedIcon?: boolean;
    disabled?: boolean;
    required?: boolean;
    value?: string;
    name?: string;
};

// Progress Types
type MdLinearProgressProps = React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
    value?: number;
    buffer?: number;
    max?: number;
    indeterminate?: boolean;
    fourColor?: boolean;
};

type MdCircularProgressProps = React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
    value?: number;
    max?: number;
    indeterminate?: boolean;
    fourColor?: boolean;
};

// Slider Types
type MdSliderProps = React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
    min?: number;
    max?: number;
    value?: number;
    'value-start'?: number;
    'value-end'?: number;
    step?: number;
    ticks?: boolean;
    labeled?: boolean;
    range?: boolean;
    disabled?: boolean;
    label?: string;
    'label-start'?: string;
    'label-end'?: string;
    'aria-label-start'?: string;
    'aria-value-text-start'?: string;
    'aria-label-end'?: string;
    'aria-value-text-end'?: string;
};

// Ripple Types
type MdRippleProps = React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
    disabled?: boolean;
    for?: string;
    unbounded?: boolean;
};

declare module 'react' {
    namespace JSX {
        interface IntrinsicElements {
            // Buttons
            'md-filled-button': MdButtonProps;
            'md-outlined-button': MdButtonProps;
            'md-text-button': MdButtonProps;
            'md-elevated-button': MdButtonProps;
            'md-filled-tonal-button': MdButtonProps;
            // Icon Buttons
            'md-icon-button': MdButtonProps;
            'md-filled-icon-button': MdButtonProps;
            'md-filled-tonal-icon-button': MdButtonProps;
            'md-outlined-icon-button': MdButtonProps;
            // Switch
            'md-switch': MdSwitchProps;
            // Progress
            'md-linear-progress': MdLinearProgressProps;
            'md-circular-progress': MdCircularProgressProps;
            // Slider
            'md-slider': MdSliderProps;
            // Ripple
            'md-ripple': MdRippleProps;
            // Dialog
            'md-dialog': MdDialogProps;
            // Menu
            'md-menu': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
            'md-menu-item': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
        }
    }
}

declare global {
    namespace JSX {
        interface IntrinsicElements {
            // Buttons
            'md-filled-button': MdButtonProps;
            'md-outlined-button': MdButtonProps;
            'md-text-button': MdButtonProps;
            'md-elevated-button': MdButtonProps;
            'md-filled-tonal-button': MdButtonProps;
            // Icon Buttons
            'md-icon-button': MdButtonProps;
            'md-filled-icon-button': MdButtonProps;
            'md-filled-tonal-icon-button': MdButtonProps;
            'md-outlined-icon-button': MdButtonProps;
            // Switch
            'md-switch': MdSwitchProps;
            // Progress
            'md-linear-progress': MdLinearProgressProps;
            'md-circular-progress': MdCircularProgressProps;
            // Slider
            'md-slider': MdSliderProps;
            // Ripple
            'md-ripple': MdRippleProps;
            // Dialog
            'md-dialog': MdDialogProps;
            // Menu
            'md-menu': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
            'md-menu-item': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
        }
    }
}

export {};
