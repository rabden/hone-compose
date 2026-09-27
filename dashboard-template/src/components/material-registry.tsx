"use client";

import { useEffect } from 'react';

/**
 * MaterialRegistry
 * 
 * Client-side dynamic imports for Material Web Components
 * This ensures the custom elements are registered in the browser.
 * 
 * Usage: Place <MaterialRegistry /> at the root of your app (e.g., in main.tsx or App.tsx)
 */
export function MaterialRegistry() {
    useEffect(() => {
        // Buttons
        import('@material/web/button/filled-button.js');
        import('@material/web/button/outlined-button.js');
        import('@material/web/button/text-button.js');
        import('@material/web/button/elevated-button.js');
        import('@material/web/button/filled-tonal-button.js');
        // Icon Buttons
        import('@material/web/iconbutton/icon-button.js');
        import('@material/web/iconbutton/filled-icon-button.js');
        import('@material/web/iconbutton/filled-tonal-icon-button.js');
        import('@material/web/iconbutton/outlined-icon-button.js');
        // Progress
        import('@material/web/progress/linear-progress.js');
        import('@material/web/progress/circular-progress.js');
        // Switch
        import('@material/web/switch/switch.js');
        // Slider
        import('@material/web/slider/slider.js');
        // Ripple
        import('@material/web/ripple/ripple.js');
        // Menu
        import('@material/web/menu/menu.js');
        import('@material/web/menu/menu-item.js');
        // Dialog
        import('@material/web/dialog/dialog.js');
    }, []);

    return null;
}
