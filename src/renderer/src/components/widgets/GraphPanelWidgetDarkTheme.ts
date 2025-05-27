import * as echarts from 'echarts/core'

export function registerGraphPanelWidgetDarkTheme(): string {
  const THEME_NAME = 'graphPanelWidgetDarkTheme'

  echarts.registerTheme(THEME_NAME, {
    color: [
      '#7289ab', // Blue
      '#ea7e53', // Orange
      '#eedd78', // Yellow
      '#e69d87', // Pink
      '#73a373', // Green
      '#73b9bc', // Cyan
      '#dd6b66' // Red
    ],
    backgroundColor: '#18181b', // --p-content-background
    valueAxis: {
      axisLabel: {
        color: '#ffffff' // --p-text-color
      },
      axisLine: {
        lineStyle: {
          color: '#71717a' // --p-surface-500
        }
      },
      minorSplitLine: {
        lineStyle: {
          color: '#27272a' // --p-surface-800
        }
      },
      splitLine: {
        lineStyle: {
          color: '#3f3f46' // --p-surface-700
        }
      }
    }
  })

  return THEME_NAME
}
