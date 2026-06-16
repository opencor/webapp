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

// A composable that provides an overlay container as an append target for PrimeVue overlays. PrimeVue's
// `absolutePosition()` computes document-absolute coordinates (viewport-relative `getBoundingClientRect()` plus
// `windowScrollTop`/`windowScrollLeft`). The container uses `position: fixed` inside `.opencor`, and its `top`/`left`
// are dynamically negated by the current scroll offset (`-scrollY`/`-scrollX`). This converts PrimeVue's
// document-absolute coordinates back to viewport-relative, so overlays appear at the correct screen position regardless
// of the host app's scroll state.
//
// Keeping the container inside `.opencor` also ensures that overlays are visible when the host app uses full-screen
// mode (the Fullscreen API only renders the full-screen element and its CSS descendants), and that they inherit
// `.opencor`'s CSS properties through the DOM tree.

export const useAppendTarget = (ancestorRef: vue.Ref<HTMLElement | null>) => {
  const appendTarget = vue.shallowRef<HTMLElement | undefined>(undefined);
  const containerClass = 'opencor-overlay-container';

  vue.onMounted(() => {
    const opencor = ancestorRef.value?.closest('.opencor');

    if (opencor) {
      let container = opencor.querySelector(`.${containerClass}`) as HTMLElement | null;

      if (!container) {
        const divElement = document.createElement('div');

        divElement.className = containerClass;
        divElement.style.cssText =
          'position: fixed; top: 0; left: 0; width: 0; height: 0; overflow: visible; pointer-events: none; z-index: 99999;';

        // Restore pointer events for overlay content teleported into the container.

        divElement.appendChild(
          Object.assign(document.createElement('style'), {
            textContent: `.${containerClass} > * { pointer-events: auto; }`
          })
        );

        opencor.appendChild(divElement);

        const updateOffset = (): void => {
          divElement.style.top = `-${window.scrollY}px`;
          divElement.style.left = `-${window.scrollX}px`;
        };

        updateOffset();

        window.addEventListener('scroll', updateOffset, { passive: true });

        container = divElement;
      }

      appendTarget.value = container;
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
