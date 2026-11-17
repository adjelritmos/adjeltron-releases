// Tema HeroUI: monocromático (preto e branco), com cor só para estados.
import { heroui } from '@heroui/react'

const gray = { 50: '#0d0d0d', 100: '#171717', 200: '#232323', 300: '#333333', 400: '#4d4d4d', 500: '#737373', 600: '#a3a3a3', 700: '#cfcfcf', 800: '#e5e5e5', 900: '#f5f5f5' }

export default heroui({
  defaultTheme: 'dark',
  layout: { radius: { small: '6px', medium: '8px', large: '12px' }, borderWidth: { small: '1px', medium: '1px', large: '2px' } },
  themes: {
    dark: {
      colors: {
        background: '#0a0a0a',
        foreground: '#ededed',
        divider: '#ffffff1a',
        focus: '#ffffff',
        overlay: '#000000',
        content1: '#121212',
        content2: '#1a1a1a',
        content3: '#242424',
        content4: '#2e2e2e',
        default: { ...gray, DEFAULT: '#262626', foreground: '#ededed' },
        primary: { ...gray, DEFAULT: '#f5f5f5', foreground: '#0a0a0a' },
        secondary: { ...gray, DEFAULT: '#3a3a3a', foreground: '#f5f5f5' },
        success: { DEFAULT: '#4ade80', foreground: '#052e12' },
        warning: { DEFAULT: '#fbbf24', foreground: '#1f1500' },
        danger: { DEFAULT: '#f87171', foreground: '#2a0606' },
      },
    },
  },
})
