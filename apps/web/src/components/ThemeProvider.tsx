import { createContext, useContext, useLayoutEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export type Theme = 'light' | 'dark'
export type TextSize = 'normal' | 'large' | 'extra-large'

type ThemePreferences = {
  theme: Theme
  textSize: TextSize
  toggleTheme: () => void
  setTextSize: (size: TextSize) => void
}

const THEME_KEY = 'lendloop.theme'
const TEXT_SIZE_KEY = 'lendloop.textSize'
const ThemeContext = createContext<ThemePreferences | null>(null)

function loadTheme(): Theme {
  try {
    const saved = window.localStorage.getItem(THEME_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch { /* Continue with the system preference when storage is unavailable. */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function loadTextSize(): TextSize {
  try {
    const saved = window.localStorage.getItem(TEXT_SIZE_KEY)
    if (saved === 'large' || saved === 'extra-large') return saved
  } catch { /* Use normal text when storage is unavailable. */ }
  return 'normal'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(loadTheme)
  const [textSize, setTextSize] = useState<TextSize>(loadTextSize)

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
    document.body.dataset.theme = theme
    document.body.dataset.textSize = textSize
    const themeColor = getComputedStyle(document.body).getPropertyValue('--bg').trim()
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor)
    try {
      window.localStorage.setItem(THEME_KEY, theme)
      window.localStorage.setItem(TEXT_SIZE_KEY, textSize)
    } catch { /* The in-memory setting still applies for this visit. */ }
  }, [theme, textSize])

  const value = useMemo<ThemePreferences>(() => ({
    theme,
    textSize,
    toggleTheme: () => setTheme((current) => current === 'light' ? 'dark' : 'light'),
    setTextSize,
  }), [theme, textSize])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useThemePreferences() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useThemePreferences must be used inside ThemeProvider')
  return context
}
