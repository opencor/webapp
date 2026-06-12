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

// Hybrid append target strategy for PrimeVue overlays:
//  - Default: append to `document.body`. This avoids containing-block issues from CSS ancestors (e.g.,
//    `position: relative` or `overflow: hidden`) that would clip the overlay. Even if an ancestor has
//    `overflow: hidden`, the fixed container gets clipped entirely.
//  - Full-screen fallback: when a non-`body` element enters full-screen mode, `body`-level overlays become hidden
//    behind the full-screen container. In that case, we fall back to a `position: fixed` container inside `.opencor`
//    (which is a descendant of the full-screen element). The `getBoundingClientRect()`-based correction handles both
//    plain scroll offsets and any containing-block shifts from CSS ancestors.

export const useAppendTarget = () => {
  const appendTarget = vue.shallowRef<HTMLElement | undefined>(undefined);
  const containerClass = 'opencor-overlay-container';

  // Lazily create the fixed container inside `.opencor` (only needed for full-screen fallback).

  const containerInsideOpencor = (instance: vue.ComponentInternalInstance | null): HTMLElement | undefined => {
    const rootEl = instance?.vnode?.el;
    const opencor = rootEl instanceof Element ? rootEl.closest('.opencor') : document.querySelector('.opencor');

    if (!opencor) {
      return undefined;
    }

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

      const container = overlayContainer;
      const updateScrollOffset = () => {
        const rect = container.getBoundingClientRect();
        const oldTop = parseFloat(container.style.top) || 0;
        const oldLeft = parseFloat(container.style.left) || 0;
        const newTop = oldTop - rect.top - window.scrollY;
        const newLeft = oldLeft - rect.left - window.scrollX;

        if (Math.abs(newTop - oldTop) >= 0.5 || Math.abs(newLeft - oldLeft) >= 0.5) {
          container.style.top = `${newTop}px`;
          container.style.left = `${newLeft}px`;
        }
      };

      updateScrollOffset();

      window.addEventListener('scroll', updateScrollOffset, { passive: true });
    }

    return overlayContainer;
  };

  // Resolve the correct append target based on the full-screen state.

  const resolveAppendTarget = (instance: vue.ComponentInternalInstance | null): HTMLElement => {
    const fullscreenEl = document.fullscreenElement;

    // If we're in full-screen mode and the full-screen element doesn't contain `body`, then `body` is hidden behind the
    // full-screen container, in which case we use the fixed container inside `.opencor`.

    if (fullscreenEl && !fullscreenEl.contains(document.body)) {
      return containerInsideOpencor(instance) ?? document.body;
    }

    // In normal mode, we use `document.body` to avoid containing-block/clipping issues.

    return document.body;
  };

  vue.onMounted(() => {
    const instance = vue.getCurrentInstance();

    // Initial resolution.

    appendTarget.value = resolveAppendTarget(instance);

    // Re-resolve when full-screen state changes.

    document.addEventListener('fullscreenchange', () => {
      appendTarget.value = resolveAppendTarget(instance);
    });
  });

  return appendTarget;
};
