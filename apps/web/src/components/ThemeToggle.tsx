import { Moon, Sun } from 'lucide-react'
import { useThemePreferences } from './ThemeProvider'

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme } = useThemePreferences()
  const Icon = theme === 'dark' ? Moon : Sun
  return <button type="button" className={`theme-toggle ${compact ? 'theme-toggle--compact' : ''}`} onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} aria-pressed={theme === 'dark'}>
    <Icon size={18} aria-hidden="true" />
    <span>{theme === 'dark' ? 'Dark mode' : 'Light mode'}</span>
  </button>
}
