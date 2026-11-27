export const URI_SCHEME: string = 'opencor';
export const FULL_URI_SCHEME: string = `${URI_SCHEME}://`;

export const VERY_SHORT_DELAY: number = 19;
export const SHORT_DELAY: number = 69;
export const MEDIUM_DELAY: number = 169;
export const LONG_DELAY: number = 369;

export const STOP_RUN_TIMEOUT: number = 5000;

// How long a toast is shown for, depending on its severity (see ToastMessageWidget.vue), with an error being shown
// until it is closed.

export const TOAST_LIFE: number = 3000;
export const WARNING_TOAST_LIFE: number = 8000;

export const COPY_FEEDBACK_LIFE: number = 2000;

export const MAX_RECENT_FILES: number = 10;

export const HINT_DELAY: number = 500;

// The overlays that Escape closes (e.g., a popover or the panel of a select), which are appended to the overlay
// container of an instance of OpenCOR (see useAppendTarget() in vueCommon.ts), and the tooltips that Escape dismisses
// (see hint.ts, ViewSwitcherComponent.vue, and ToolbarButtonWidget.vue), which are also within an instance of OpenCOR.

export const ESCAPE_KEY_OVERLAYS: string = '.p-popover, .p-select-overlay, .p-contextmenu, .p-menubar-submenu';
export const ESCAPE_KEY_TOOLTIPS: string = '.opencor-hint, .view-tooltip, .toolbar-button-tooltip';

export const NARROW_LAYOUT_WIDTH: number = 640;

export const SPIN_INITIAL_DELAY: number = 500;
export const SPIN_REPEAT_DELAY: number = 40;
export const SPIN_LARGE_STEP_FACTOR: number = 10;

const crtYear: number = new Date().getFullYear();

export const COPYRIGHT: string = crtYear === 2025 ? '2025' : `2025-${crtYear}`;
