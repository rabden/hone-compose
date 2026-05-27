"use client";

import React, { useState, useRef, useEffect, useId } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Check, User } from 'lucide-react';
import { Menu, MenuItem } from '@/components/ui/menu';
import { Ripple } from '@/components/ui/ripple';

interface DropdownItem {
    id: string;
    name: string;
    count?: number;
    avatar?: string;
}

interface ModernDropdownProps {
    label: string;
    items: DropdownItem[];
    value: string | null;
    onChange: (value: string | null) => void;
    placeholder?: string;
    icon?: React.ReactNode;
    type?: 'basic' | 'avatar';
    className?: string;
}

export function ModernDropdown({
    label,
    items,
    value,
    onChange,
    icon,
    type = 'basic',
    className
}: ModernDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const anchorRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLElement>(null);
    const anchorId = useId();

    const selectedItem = items.find(item => item.id === value);

    const handleClose = () => {
        setIsOpen(false);
    };

    // Set anchor element imperatively for Material Web
    useEffect(() => {
        if (menuRef.current && anchorRef.current) {
            (menuRef.current as any).anchorElement = anchorRef.current;
        }
    }, []);

    return (
        <div className={cn("relative", className)}>
            <button
                ref={anchorRef}
                id={anchorId}
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center gap-2 px-4 py-2 border rounded-full text-sm font-medium transition-all duration-200 outline-none focus-visible:ring-0 select-none",
                    isOpen ? "border-border" : "border-input hover:border-border hover:bg-muted/30",
                    value ? "bg-primary/5 text-foreground" : "text-muted-foreground"
                )}
            >
                {icon && <span className={cn("w-4 h-4", value ? "text-primary" : "text-muted-foreground")}>{icon}</span>}
                <span>
                    {selectedItem ? selectedItem.name : label}
                </span>
                <ChevronDown className={cn(
                    "w-3.5 h-3.5 transition-transform duration-200",
                    isOpen && "rotate-180"
                )} />
                <Ripple />
            </button>

            {/* Material Web Menu */}
            <Menu
                ref={menuRef}
                anchor={anchorId}
                open={isOpen}
                onClosed={handleClose}
                positioning="popover"
                anchorCorner="end-start"
                menuCorner="start-start"
                yOffset={8}
                className="min-w-[240px] max-w-[280px] rounded-xl overflow-hidden"
            >
                {/* Clear Option */}
                <MenuItem
                    selected={!value}
                    onClick={() => {
                        onChange(null);
                        handleClose();
                    }}
                >
                    <div slot="headline" className={cn("font-medium", !value && "text-primary")}>All {label}</div>
                    {!value && <div slot="end"><Check className="w-4 h-4 text-primary" /></div>}
                </MenuItem>

                {items.map(item => (
                    <MenuItem
                        key={item.id}
                        selected={value === item.id}
                        onClick={() => {
                            onChange(item.id);
                            handleClose();
                        }}
                    >
                        {type === 'avatar' && (
                            <div slot="start" className="w-6 h-6 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0 border border-border/30">
                                {item.avatar ? (
                                    <img src={item.avatar} alt={item.name} className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-3 h-3 text-muted-foreground" />
                                )}
                            </div>
                        )}
                        <div slot="headline" className="font-medium">{item.name}</div>
                        {item.count !== undefined && (
                            <div slot="supporting-text" className="text-xs text-muted-foreground">
                                {item.count} articles
                            </div>
                        )}
                        {value === item.id && <div slot="end"><Check className="w-4 h-4 text-primary" /></div>}
                    </MenuItem>
                ))}
            </Menu>
        </div>
    );
}
