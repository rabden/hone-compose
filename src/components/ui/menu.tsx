"use client";

import React, { useRef, useEffect } from 'react';
import '@material/web/menu/menu.js';
import '@material/web/menu/menu-item.js';
import { cn } from '@/lib/utils';

// --- MATERIAL EXPRESSIVE THEME ---
// Segmented tiles: tight inner corners, large outer corners, press morphs to a pill.
const SPRING = 'ease-[cubic-bezier(0.2,0.8,0.2,1.2)]';

const MENU_TOKENS = {
    '--md-menu-container-color': 'var(--card)',
    '--md-menu-container-shape': '24px',
    '--md-menu-container-shadow-color': 'var(--foreground)',
    '--md-menu-container-surface-tint-layer-color': 'transparent',
    '--md-menu-container-elevation': '0',
} as React.CSSProperties;

const ITEM_TOKENS = {
    '--md-menu-item-container-color': 'transparent',
    '--md-menu-item-selected-container-color': 'transparent',
    '--md-menu-item-one-line-container-height': '36px',
    '--md-menu-item-top-space': '6px',
    '--md-menu-item-bottom-space': '6px',
    '--md-menu-item-leading-space': '14px',
    '--md-menu-item-trailing-space': '14px',
    '--md-menu-item-label-text-size': '13px',
    '--md-menu-item-label-text-weight': '600',
    '--md-menu-item-label-text-color': 'var(--muted-foreground)',
    '--md-menu-item-hover-label-text-color': 'var(--foreground)',
    '--md-menu-item-focus-label-text-color': 'var(--foreground)',
    '--md-menu-item-pressed-label-text-color': 'var(--foreground)',
    '--md-menu-item-selected-label-text-color': 'var(--foreground)',
    '--md-menu-item-supporting-text-color': 'var(--muted-foreground)',
    '--md-menu-item-leading-icon-color': 'var(--muted-foreground)',
    '--md-menu-item-hover-leading-icon-color': 'var(--foreground)',
    '--md-menu-item-focus-leading-icon-color': 'var(--foreground)',
    '--md-menu-item-selected-leading-icon-color': 'var(--foreground)',
    '--md-menu-item-trailing-icon-color': 'var(--muted-foreground)',
    // Hover/focus background is painted on the host (bg-background); keep the state layer for press only.
    '--md-menu-item-hover-state-layer-opacity': '0',
    '--md-menu-item-focus-state-layer-opacity': '0',
    '--md-menu-item-pressed-state-layer-color': 'currentColor',
    '--md-menu-item-pressed-state-layer-opacity': '0.12',
} as React.CSSProperties;

const MENU_CLASS = cn(
    'min-w-40 [&::part(menu-items)]:flex [&::part(menu-items)]:flex-col',
    '[&::part(menu-items)]:gap-0.5 [&::part(menu-items)]:p-px',
    '[&::part(menu)]:border [&::part(menu)]:border-border/20',
);

const ITEM_CLASS = cn(
    'cursor-default select-none overflow-hidden outline-none',
    'rounded-md first:rounded-t-3xl last:rounded-b-3xl',
    'transition-[background-color,color,border-radius] duration-300',
    SPRING,
    'hover:bg-background focus:bg-background focus-visible:bg-background',
    'active:rounded-[36px] [&[selected]]:rounded-[36px]',
    '[&[disabled]]:pointer-events-none [&[disabled]]:opacity-40',
);

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
    // eslint-disable-next-line @typescript-eslint/no-namespace
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
    style,
    ...props
}, ref) => {
    const menuRef = useRef<HTMLElement>(null);
    const resolvedRef = (ref as React.RefObject<HTMLElement>) || menuRef;

    // Set anchorElement imperatively (can't be done via attribute)
    useEffect(() => {
        const menuEl = resolvedRef.current as HTMLElement & { anchorElement?: HTMLElement | null };
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
        <md-menu
            ref={resolvedRef as React.Ref<HTMLElement>}
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
            className={cn(MENU_CLASS, className)}
            style={{ ...MENU_TOKENS, ...style }}
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
    style,
    ...props
}, ref) => {
    return (
        <md-menu-item
            ref={ref as React.Ref<HTMLElement>}
            disabled={disabled || undefined}
            type={type}
            href={href}
            target={target}
            keep-open={keepOpen || undefined}
            selected={selected || undefined}
            className={cn(ITEM_CLASS, className)}
            style={{ ...ITEM_TOKENS, ...style }}
            suppressHydrationWarning
            {...props}
        >
            {children}
        </md-menu-item>
    );
});

MenuItem.displayName = 'MenuItem';
