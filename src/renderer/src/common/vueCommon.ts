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

// Teleport the target inside `.opencor` so that it is visible in full-screen mode and not affected by PrimeVue's
// `absolutePosition()` adding scroll offsets.

export const useAppendTarget = () => {
  const appendTarget = vue.shallowRef<HTMLElement | undefined>(undefined);
  const containerClass = 'opencor-overlay-container';

  vue.onMounted(() => {
    // Find the `.opencor` element to append the target to. First try to find it from the current component's root
    // element to support multiple instances of OpenCOR in the same page, and if that fails we fall back to searching
    // the whole document.

    const instance = vue.getCurrentInstance();
    const rootEl = instance?.vnode?.el;
    const opencor = rootEl instanceof Element ? rootEl.closest('.opencor') : document.querySelector('.opencor');

    if (opencor) {
      let overlayContainer = opencor.querySelector(`.${containerClass}`) as HTMLElement | null;

      if (!overlayContainer) {
        overlayContainer = document.createElement('div');

        overlayContainer.className = containerClass;
        overlayContainer.style.cssText =
          'position: fixed; width: 0; height: 0; overflow: visible; pointer-events: none; z-index: 99999;';

        // Restore pointer events for overlay content teleported into the container.

        overlayContainer.appendChild(
          Object.assign(document.createElement('style'), {
            textContent: `.${containerClass} > * { pointer-events: auto; }`
          })
        );

        const container = overlayContainer;
        const updateScrollOffset = () => {
          container.style.top = `-${window.scrollY}px`;
          container.style.left = `-${window.scrollX}px`;
        };

        updateScrollOffset();

        window.addEventListener('scroll', updateScrollOffset, { passive: true });

        opencor.appendChild(overlayContainer);
      }

      appendTarget.value = overlayContainer;
    }
  });

  return appendTarget;
};
