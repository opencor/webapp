import * as vueusecore from '@vueuse/core'

import * as vue from 'vue'

import type { Theme } from '../../index.js'

// A constant to know the uid of the active instance of OpenCOR.

export const activeInstanceUid = vueusecore.createGlobalState(() => vue.ref<string | null>(null))

// Some constants to know whether the operating system uses light mode or dark mode.

const _prefersColorScheme = window.matchMedia('(prefers-color-scheme: light)')
const _isLightMode = vue.ref(_prefersColorScheme.matches)
const _isDarkMode = vue.ref(!_prefersColorScheme.matches)
let _theme: Theme = 'system'

_prefersColorScheme.addEventListener('change', (event) => {
  if (_theme === 'system') {
    _isLightMode.value = event.matches
    _isDarkMode.value = !event.matches
  }
})

export function setTheme(theme: Theme) {
  _theme = theme

  if (theme === 'light') {
    _isLightMode.value = true
    _isDarkMode.value = false
  } else if (theme === 'dark') {
    _isLightMode.value = false
    _isDarkMode.value = true
  }
}

export function useLightMode(): boolean {
  return _isLightMode.value
}

export function useDarkMode(): boolean {
  return _isDarkMode.value
}

// A method to retrieve the name of a tracked CSS variable.

export function trackedCssVariableName(id: string): string {
  return '--' + (id.split('_')[0] ?? '').replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase() + '-height'
}

// A method to track the height of a given element.

export function trackElementHeight(id: string): ResizeObserver | undefined {
  const element = document.getElementById(id)

  if (element !== null) {
    const resizeObserver = new ResizeObserver(() => {
      let elementHeight = window.getComputedStyle(element).height

      if (elementHeight === '' || elementHeight === 'auto') {
        elementHeight = '0px'
      }

      const cssVariableName = trackedCssVariableName(id)
      const oldElementHeight = document.documentElement.style.getPropertyValue(cssVariableName)

      if (oldElementHeight === '' || (elementHeight !== '0px' && oldElementHeight !== elementHeight)) {
        document.documentElement.style.setProperty(cssVariableName, elementHeight)
      }
    })

    resizeObserver.observe(element)

    return resizeObserver
  }

  return undefined
}

// A method to retrieve the value of a tracked CSS variable.

export function trackedCssVariableValue(id: string): number {
  const propertyValue = document.documentElement.style.getPropertyValue(trackedCssVariableName(id))

  return propertyValue ? parseFloat(propertyValue) : 0
}
