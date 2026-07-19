'use client'

import type * as React from 'react'

type ThemeProviderProps = React.PropsWithChildren<{
  attribute?: string
  defaultTheme?: string
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
  forcedTheme?: string
  storageKey?: string
  themes?: string[]
  value?: Record<string, string>
  nonce?: string
}>

export function ThemeProvider({ children }: ThemeProviderProps) {
  return <>{children}</>
}
