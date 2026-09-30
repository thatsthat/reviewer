import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Switch } from '#/components/ui/switch'

type Theme = 'light' | 'dark'

function readStoredTheme(): Theme {
  return window.localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(theme)
  root.setAttribute('data-theme', theme)
  root.style.colorScheme = theme
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    setTheme(readStoredTheme())
  }, [])

  function handleCheckedChange(checked: boolean) {
    const next: Theme = checked ? 'dark' : 'light'
    setTheme(next)
    window.localStorage.setItem('theme', next)
    applyTheme(next)
  }

  const isDark = theme === 'dark'

  return (
    <div className="flex items-center gap-2 rounded-full border border-border bg-background px-2.5 py-1.5 shadow-sm">
      <Sun
        className={isDark ? 'size-4 text-muted-foreground' : 'size-4 text-foreground'}
        aria-hidden="true"
      />
      <Switch
        checked={isDark}
        onCheckedChange={handleCheckedChange}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      />
      <Moon
        className={isDark ? 'size-4 text-foreground' : 'size-4 text-muted-foreground'}
        aria-hidden="true"
      />
    </div>
  )
}
