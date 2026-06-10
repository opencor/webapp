import * as vueusecore from '@vueuse/core';

import * as vue from 'vue';

import type { OpenCORTheme } from '../../index';

// A constant to know the UID of the active instance of OpenCOR.

export const activeInstanceUid = vueusecore.createGlobalState(() => vue.ref<string | null>(null));

// A composable to know whether OpenCOR uses light mode, dark mode, or system mode.

export const useTheme = vueusecore.createGlobalState(() => {
  const prefersColorScheme = window.matchMedia('(prefers-color-scheme: light)');
  const isLightMode = vue.ref(prefersColorScheme.matches);
  const isDarkMode = vue.ref(!prefersColorScheme.matches);
  const _theme = vue.ref<OpenCORTheme>('system');

  const updateLightAndDarkModes = (prefersColorScheme: MediaQueryList | MediaQueryListEvent) => {
    isLightMode.value = prefersColorScheme.matches;
    isDarkMode.value = !prefersColorScheme.matches;
  };

  const updateDocumentClasses = () => {
    document.documentElement.classList.toggle('opencor-dark-mode', isDarkMode.value);
  };

  prefersColorScheme.addEventListener('change', (event) => {
    if (_theme.value === 'system') {
      updateLightAndDarkModes(event);
      updateDocumentClasses();
    }
  });

  const theme = (): OpenCORTheme => {
    return _theme.value;
  };

  const setTheme = (newTheme: OpenCORTheme | undefined) => {
    _theme.value = newTheme ?? 'system';

    if (_theme.value === 'light') {
      isLightMode.value = true;
      isDarkMode.value = false;
    } else if (_theme.value === 'dark') {
      isLightMode.value = false;
      isDarkMode.value = true;
    } else {
      updateLightAndDarkModes(prefersColorScheme);
    }

    updateDocumentClasses();
  };

  const useLightMode = (): boolean => {
    return isLightMode.value;
  };

  const useDarkMode = (): boolean => {
    return isDarkMode.value;
  };

  return {
    theme,
    setTheme,
    useLightMode,
    useDarkMode
  };
});

// A composable to track the height of an element as a CSS variable.

export const trackElementHeight = (
  sourceElement: HTMLElement,
  targetElement: HTMLElement,
  cssVariableName: string
): (() => void) => {
  const updateHeight = () => {
    const height = sourceElement.offsetHeight;

    targetElement.style.setProperty(cssVariableName, `${height}px`);
  };

  // Set the initial height.

  updateHeight();

  // Watch for height changes, including border and padding changes.

  const { stop: stopTrackingElementHeight } = vueusecore.useResizeObserver(
    sourceElement,
    () => {
      updateHeight();
    },
    { box: 'border-box' }
  );

  // Return the function to stop tracking the element's height.

  return stopTrackingElementHeight;
};

// A composable that provides the `.opencor` element as an append target for overlays.
// Note: this is needed when OpenCOR is embedded as a Vue 3 component in a host app that uses full-screen mode. In such
//       a case, the Fullscreen API only renders the full-screen element and its descendants, so teleporting to
//       `document.body` makes overlays invisible. Instead, teleporting to `.opencor` means that overlays are visible in
//       full-screen mode. And, since `.opencor` is a child of the full-screen element, they are also visible in normal
//       mode.

export const useAppendTarget = () => {
  const appendTarget = vue.shallowRef<HTMLElement | undefined>(undefined);

  vue.onMounted(() => {
    appendTarget.value = (document.querySelector('.opencor') as HTMLElement | null) ?? undefined;
  });

  return appendTarget;
};
