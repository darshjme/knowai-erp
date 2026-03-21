/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Surfaces — use CSS custom properties for theme switching
        'bg-primary': 'var(--bg-primary)',
        'bg-card': 'var(--bg-card)',
        'bg-elevated': 'var(--bg-elevated)',
        'border-default': 'var(--border-default)',
        'border-subtle': 'var(--border-subtle)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        // Accents — same in both themes
        'accent-purple': '#7C3AED',
        'accent-blue': '#3B82F6',
        'accent-green': '#10B981',
        'accent-amber': '#F59E0B',
        'accent-red': '#EF4444',
      },
      fontFamily: {
        heading: ['Manrope', 'Inter', '-apple-system', 'sans-serif'],
        body: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'monospace'],
      },
      fontSize: {
        'hero': ['24px', { lineHeight: '1.3', fontWeight: '700' }],
        'page-title': ['18px', { lineHeight: '1.3', fontWeight: '600' }],
        'section': ['14px', { lineHeight: '1.3', fontWeight: '600' }],
        'stat-lg': ['22px', { lineHeight: '1.2', fontWeight: '700' }],
        'stat-md': ['16px', { lineHeight: '1.2', fontWeight: '600' }],
        'body': ['13px', { lineHeight: '1.5', fontWeight: '400' }],
        'caption': ['11px', { lineHeight: '1.4', fontWeight: '400' }],
        'nav': ['13px', { lineHeight: '1.5', fontWeight: '500' }],
        'btn': ['13px', { lineHeight: '1.5', fontWeight: '600' }],
        'label': ['10px', { lineHeight: '1.4', fontWeight: '500', letterSpacing: '0.08em' }],
      },
      spacing: {
        'sidebar': '240px',
        'sidebar-collapsed': '64px',
        'header': '56px',
        'panel': '280px',
        'panel-4k': '360px',
        'panel-icon': '48px',
      },
      borderRadius: {
        'sm': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
      },
      boxShadow: {
        'card-hover': '0 4px 12px rgba(124, 58, 237, 0.15)',
        'elevated': '0 4px 6px rgba(0, 0, 0, 0.07)',
        'modal': '0 8px 24px rgba(0, 0, 0, 0.2)',
      },
      maxWidth: {
        'content-4k': '1800px',
      },
      screens: {
        'xs': '375px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1920px',
        '3xl': '2560px',
      },
      animation: {
        'shimmer': 'shimmer 1.5s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
