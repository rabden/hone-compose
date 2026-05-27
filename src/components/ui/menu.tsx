"use client";

import React, { useRef, useEffect } from 'react';
import '@material/web/menu/menu.js';
import '@material/web/menu/menu-item.js';

type MdMenuProps = React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
    anchor?: string;
    positioning?: 'absolute' | 'fixed' | 'document' | 'popover';
    quick?: boolean;
    'has-overflow'?: boolean;
    open?: boolean;
    'x-offset'?: number;
    'y-offset'?: number;
    'typeahead-delay'?: number;
    'anchor-corner'?: 'start-start' | 'start-end' | 'end-start' | 'end-end';
    'menu-corner'?: 'start-start' | 'start-end' | 'end-start' | 'end-end';
    'no-horizontal-flip'?: boolean;
    'no-vertical-flip'?: boolean;
    'stay-open-on-outside-click'?: boolean;
    'stay-open-on-focusout'?: boolean;
    'skip-restore-focus'?: boolean;
    'default-focus'?: 'none' | 'list-root' | 'first-item' | 'last-item';
    'no-navigation-wrap'?: boolean;
};

type MdMenuItemProps = React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
    disabled?: boolean;
    type?: 'menuitem' | 'option' | 'button' | 'link';
    href?: string;
    target?: string;
    'keep-open'?: boolean;
    selected?: boolean;
};

declare module 'react' {
    namespace JSX {
        interface IntrinsicElements {
            'md-menu': MdMenuProps;
            'md-menu-item': MdMenuItemProps;
        }
    }
}

// Menu wrapper component
interface MenuProps extends React.HTMLAttributes<HTMLElement> {
    anchor?: string;
    anchorElement?: HTMLElement | null;
    positioning?: 'absolute' | 'fixed' | 'document' | 'popover';
    quick?: boolean;
    hasOverflow?: boolean;
    open?: boolean;
    xOffset?: number;
    yOffset?: number;
    typeaheadDelay?: number;
    anchorCorner?: 'start-start' | 'start-end' | 'end-start' | 'end-end';
    menuCorner?: 'start-start' | 'start-end' | 'end-start' | 'end-end';
    noHorizontalFlip?: boolean;
    noVerticalFlip?: boolean;
    stayOpenOnOutsideClick?: boolean;
    stayOpenOnFocusout?: boolean;
    skipRestoreFocus?: boolean;
    defaultFocus?: 'none' | 'list-root' | 'first-item' | 'last-item';
    noNavigationWrap?: boolean;
    onOpening?: () => void;
    onOpened?: () => void;
    onClosing?: () => void;
    onClosed?: () => void;
    className?: string;
}

export const Menu = React.forwardRef<HTMLElement, MenuProps>(({
    children,
    anchor,
    anchorElement,
    positioning = 'absolute',
    quick = false,
    hasOverflow = false,
    open = false,
    xOffset = 0,
    yOffset = 0,
    typeaheadDelay = 200,
    anchorCorner = 'end-start',
    menuCorner = 'start-start',
    noHorizontalFlip = false,
    noVerticalFlip = false,
    stayOpenOnOutsideClick = false,
    stayOpenOnFocusout = false,
    skipRestoreFocus = false,
    defaultFocus = 'first-item',
    noNavigationWrap = false,
    onOpening,
    onOpened,
    onClosing,
    onClosed,
    className,
    ...props
}, ref) => {
    const menuRef = useRef<HTMLElement>(null);
    const resolvedRef = (ref as React.RefObject<HTMLElement>) || menuRef;

    // Set anchorElement imperatively (can't be done via attribute)
    useEffect(() => {
        const menuEl = resolvedRef.current as any;
        if (menuEl && anchorElement) {
            menuEl.anchorElement = anchorElement;
        }
    }, [anchorElement, resolvedRef]);

    // Event listeners
    useEffect(() => {
        const menuEl = resolvedRef.current;
        if (!menuEl) return;

        const handleOpening = () => onOpening?.();
        const handleOpened = () => onOpened?.();
        const handleClosing = () => onClosing?.();
        const handleClosed = () => onClosed?.();

        menuEl.addEventListener('opening', handleOpening);
        menuEl.addEventListener('opened', handleOpened);
        menuEl.addEventListener('closing', handleClosing);
        menuEl.addEventListener('closed', handleClosed);

        return () => {
            menuEl.removeEventListener('opening', handleOpening);
            menuEl.removeEventListener('opened', handleOpened);
            menuEl.removeEventListener('closing', handleClosing);
            menuEl.removeEventListener('closed', handleClosed);
        };
    }, [onOpening, onOpened, onClosing, onClosed, resolvedRef]);

    return (
        // @ts-ignore - md-menu is a custom element
        <md-menu
            ref={resolvedRef as any}
            anchor={anchor}
            positioning={positioning}
            quick={quick || undefined}
            has-overflow={hasOverflow || undefined}
            open={open || undefined}
            x-offset={xOffset}
            y-offset={yOffset}
            typeahead-delay={typeaheadDelay}
            anchor-corner={anchorCorner}
            menu-corner={menuCorner}
            no-horizontal-flip={noHorizontalFlip || undefined}
            no-vertical-flip={noVerticalFlip || undefined}
            stay-open-on-outside-click={stayOpenOnOutsideClick || undefined}
            stay-open-on-focusout={stayOpenOnFocusout || undefined}
            skip-restore-focus={skipRestoreFocus || undefined}
            default-focus={defaultFocus}
            no-navigation-wrap={noNavigationWrap || undefined}
            className={className}
            suppressHydrationWarning
            {...props}
        >
            {children}
        </md-menu>
    );
});

Menu.displayName = 'Menu';

// MenuItem wrapper component
interface MenuItemProps extends React.HTMLAttributes<HTMLElement> {
    disabled?: boolean;
    type?: 'menuitem' | 'option' | 'button' | 'link';
    href?: string;
    target?: string;
    keepOpen?: boolean;
    selected?: boolean;
    className?: string;
}

export const MenuItem = React.forwardRef<HTMLElement, MenuItemProps>(({
    children,
    disabled = false,
    type = 'menuitem',
    href,
    target,
    keepOpen = false,
    selected = false,
    className,
    ...props
}, ref) => {
    return (
        // @ts-ignore - md-menu-item is a custom element
        <md-menu-item
            ref={ref as any}
            disabled={disabled || undefined}
            type={type}
            href={href}
            target={target}
            keep-open={keepOpen || undefined}
            selected={selected || undefined}
            className={className}
            suppressHydrationWarning
            {...props}
        >
            {children}
        </md-menu-item>
    );
});

MenuItem.displayName = 'MenuItem';
