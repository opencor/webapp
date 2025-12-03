import * as vueusecore from '@vueuse/core';

import * as vue from 'vue';

import type { Theme } from '../../index.js';

// A constant to know the UID of the active instance of OpenCOR.

export const activeInstanceUid = vueusecore.createGlobalState(() => vue.ref<string | null>(null));

// Theme composable to know whether OpenCOR uses light mode, dark mode, or system mode.

export const useTheme = vueusecore.createGlobalState(() => {
  const prefersColorScheme = window.matchMedia('(prefers-color-scheme: light)');
  const isLightMode = vue.ref(prefersColorScheme.matches);
  const isDarkMode = vue.ref(!prefersColorScheme.matches);
  const _theme = vue.ref<Theme>('system');

  function updateLightAndDarkModes(prefersColorScheme: MediaQueryList | MediaQueryListEvent) {
    isLightMode.value = prefersColorScheme.matches;
    isDarkMode.value = !prefersColorScheme.matches;
  }

  function updateDocumentClasses() {
    document.documentElement.classList.toggle('opencor-dark-mode', isDarkMode.value);
  }

  prefersColorScheme.addEventListener('change', (event) => {
    if (_theme.value === 'system') {
      updateLightAndDarkModes(event);
      updateDocumentClasses();
    }
  });

  function theme(): Theme {
    return _theme.value;
  }

  function setTheme(newTheme: Theme | undefined) {
    _theme.value = newTheme === undefined ? 'system' : newTheme;

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
  }

  function useLightMode(): boolean {
    return isLightMode.value;
  }

  function useDarkMode(): boolean {
    return isDarkMode.value;
  }

  return {
    theme,
    setTheme,
    useLightMode,
    useDarkMode
  };
});

// A method to retrieve the name of a tracked CSS variable.

export function trackedCssVariableName(id: string): string {
  return `--${(id.split('_')[0] ?? '').replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}-height`;
}

// A method to track the height of a given element.

export function trackElementHeight(id: string): ResizeObserver | undefined {
  const element = document.getElementById(id);

  if (element !== null) {
    const resizeObserver = new ResizeObserver(() => {
      let elementHeight = window.getComputedStyle(element).height;

      if (elementHeight === '' || elementHeight === 'auto') {
        elementHeight = '0px';
      }

      const cssVariableName = trackedCssVariableName(id);
      const oldElementHeight = document.documentElement.style.getPropertyValue(cssVariableName);

      if (oldElementHeight === '' || (elementHeight !== '0px' && oldElementHeight !== elementHeight)) {
        document.documentElement.style.setProperty(cssVariableName, elementHeight);
      }
    });

    resizeObserver.observe(element);

    return resizeObserver;
  }

  return undefined;
}

// A method to retrieve the value of a tracked CSS variable.

export function trackedCssVariableValue(id: string): number {
  const propertyValue = document.documentElement.style.getPropertyValue(trackedCssVariableName(id));

  return propertyValue ? parseFloat(propertyValue) : 0;
}
