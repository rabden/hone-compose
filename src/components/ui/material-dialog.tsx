import React, { createContext, useContext, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/material-design-3-button';

interface DialogContextType {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const DialogContext = createContext<DialogContextType | null>(null);

interface DialogProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    children: React.ReactNode;
}

export function Dialog({ open = false, onOpenChange = () => { }, children }: DialogProps) {
    return (
        <DialogContext.Provider value={{ open, onOpenChange }}>
            {children}
        </DialogContext.Provider>
    );
}

interface DialogContentProps extends React.HTMLAttributes<HTMLElement> {
    children: React.ReactNode;
    /** Classes applied to the inner styled panel (background, size, padding, etc.) */
    className?: string;
    onOpened?: () => void;
}

export function DialogContent({ children, className, onOpened, ...props }: DialogContentProps) {
    const context = useContext(DialogContext);
    const dialogRef = useRef<HTMLElement & { open: boolean }>(null);

    if (!context) {
        throw new Error("DialogContent must be used within a Dialog");
    }

    const { open, onOpenChange } = context;

    // Sync React prop 'open' → Web Component property
    useEffect(() => {
        if (dialogRef.current) {
            dialogRef.current.open = open;
        }
    }, [open]);

    // Inject shadow root style override to prevent MWC's native scrollbar flashing during open/close transitions
    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        if (dialog.shadowRoot && !dialog.shadowRoot.querySelector('#mwc-scrollbar-fix')) {
            const style = document.createElement('style');
            style.id = 'mwc-scrollbar-fix';
            style.textContent = `
                .scroller {
                    scrollbar-width: none !important;
                }
                .scroller::-webkit-scrollbar {
                    display: none !important;
                }
            `;
            dialog.shadowRoot.appendChild(style);
        }
    }, []);

    // Listen for close/cancel events from md-dialog (Esc, scrim click)
    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        const handleClosed = () => {
            if (open) onOpenChange(false);
        };
        const handleOpened = () => {
            if (onOpened) onOpened();
        };

        dialog.addEventListener('closed', handleClosed);
        dialog.addEventListener('cancel', handleClosed);
        dialog.addEventListener('opened', handleOpened);

        return () => {
            dialog.removeEventListener('closed', handleClosed);
            dialog.removeEventListener('cancel', handleClosed);
            dialog.removeEventListener('opened', handleOpened);
        };
    }, [open, onOpenChange, onOpened]);

    return (
        <md-dialog ref={dialogRef} {...props}>
            {/*
             * We put everything inside slot="content" so the inner styled panel
             * is the single source of truth for appearance.
             * md-dialog's container is transparent (see CSS), so the panel
             * below provides the actual background, border, shadow, and radius.
             */}
            <div
                slot="content"
                className={cn(
                    // Default panel styles — override via className
                    "bg-card rounded-2xl shadow-lg overflow-hidden w-full flex flex-col",
                    className
                )}
            >
                {children}
            </div>
        </md-dialog>
    );
}

/**
 * Renders the dialog headline/title.
 * Note: intentionally does NOT use slot="headline" — the title renders
 * inside the styled panel (slot="content") so it shares the same background.
 */
export function DialogTitle({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    const context = useContext(DialogContext);
    return (
        <div className={cn("px-6 pt-5 pb-4 flex items-start justify-between gap-4", className)} {...props}>
            <div className="flex-1 min-w-0">
                {children}
            </div>
            {context && (
                <Button
                    variant="ghost"
                    size="icon-sm"
                    shape="round"
                    onClick={() => context.onOpenChange(false)}
                    aria-label="Close dialog"
                >
                    <X className="w-4 h-4" />
                </Button>
            )}
        </div>
    );
}

export function DialogTrigger({ children }: { children: React.ReactNode }) {
    const context = useContext(DialogContext);
    if (!context) throw new Error("DialogTrigger must be used within a Dialog");

    return (
        <div onClick={() => context.onOpenChange(true)} className="contents cursor-pointer">
            {children}
        </div>
    );
}

export { DialogContext };
