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

// A composable that provides a `position: fixed` overlay container inside `.opencor` as an append target for overlays.
// This is needed when OpenCOR is embedded as a Vue 3 component in a host app that uses full-screen mode. In such a
// case, the Fullscreen API only renders the full-screen element and its descendants, so teleporting to `document.body`
// makes overlays invisible. Teleporting to `.opencor` (via this fixed container) keeps overlays visible in full-screen
// mode.
//
// The `position: fixed` container at viewport origin (0, 0) also solves vertical offset issues when the host app has a
// positioned ancestor (e.g., `position: relative` on a wrapper). PrimeVue's `absolutePosition()` computes
// document-absolute coordinates, which rely on the offset parent being at document origin. A fixed container at (0, 0)
// provides that reference frame, so overlays appear at the correct position.

export const useAppendTarget = () => {
  const appendTarget = vue.shallowRef<HTMLElement | undefined>(undefined);
  const containerClass = 'opencor-overlay-container';

  vue.onMounted(() => {
    const opencor = document.querySelector('.opencor');

    if (opencor) {
      let overlayContainer = opencor.querySelector(`.${containerClass}`) as HTMLElement | null;

      if (!overlayContainer) {
        overlayContainer = document.createElement('div');

        overlayContainer.className = containerClass;
        overlayContainer.style.cssText =
          'position: fixed; top: 0; left: 0; width: 0; height: 0; overflow: visible; pointer-events: none; z-index: 99999;';

        // Restore pointer events for overlay content teleported into the container.

        overlayContainer.appendChild(
          Object.assign(document.createElement('style'), {
            textContent: `.${containerClass} > * { pointer-events: auto; }`
          })
        );

        opencor.appendChild(overlayContainer);
      }

      appendTarget.value = overlayContainer;
    }
  });

  return appendTarget;
};
