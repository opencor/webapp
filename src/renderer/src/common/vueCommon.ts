import * as vue from 'vue'

import type { Theme } from '../../index.js'

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

// A method to track the height of a given element.

export function trackElementHeight(id: string): void {
  vue.onMounted(() => {
    const element = document.getElementById(id)

    if (element !== null) {
      const observer = new ResizeObserver(() => {
        let elementHeight = window.getComputedStyle(element).height

        if (elementHeight === '' || elementHeight === 'auto') {
          elementHeight = '0px'
        }

        const cssVariableName =
          '--' + (id.split('_')[0] ?? '').replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase() + '-height'
        const oldElementHeight = window.getComputedStyle(document.documentElement).getPropertyValue(cssVariableName)

        if (oldElementHeight === '' || (elementHeight !== '0px' && oldElementHeight !== elementHeight)) {
          document.documentElement.style.setProperty(cssVariableName, elementHeight)
        }
      })

      observer.observe(element)

      vue.onUnmounted(() => {
        observer.disconnect()
      })
    }
  })
}
