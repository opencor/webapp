import * as echarts from 'echarts/core'

export function registerGraphPanelWidgetLightTheme(): string {
  const THEME_NAME = 'graphPanelWidgetLightTheme'

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
    backgroundColor: '#ffffff', // --p-content-background
    valueAxis: {
      axisLabel: {
        color: '#334155' // --p-text-color
      },
      axisLine: {
        lineStyle: {
          color: '#94a3b8' // --p-surface-400
        }
      },
      minorSplitLine: {
        lineStyle: {
          color: '#f1f5f9' // --p-surface-100
        }
      },
      splitLine: {
        lineStyle: {
          color: '#e2e8f0' // --p-surface-200
        }
      }
    }
  })

  return THEME_NAME
}
