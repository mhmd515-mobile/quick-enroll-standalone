/**
 * carbon-config.js
 * Clean Paper Frost Design System - Frosted Dark Obsidian Mode
 */
tailwind.config = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'brand':          '#6366f1',   // Indigo 500
        'brand-light':    '#818cf8',   // Indigo 400
        'brand-dim':      'rgba(99,102,241,0.08)',
        'brand-ring':     'rgba(99,102,241,0.15)',
        'sky':            '#38bdf8',   // Sky 400
        'sky-dim':        'rgba(56,189,248,0.06)',
        'void':           '#050508',   // Deep obsidian black
        'layer-1':        'rgba(18,18,26,0.65)',
        'layer-2':        '#0d0d12',
        'layer-3':        '#151520',
        'edge':           'rgba(255,255,255,0.04)',
        'edge-hover':     'rgba(255,255,255,0.08)',
        'edge-brand':     'rgba(99,102,241,0.3)',
        'ink-100':        '#f8fafc',   // High contrast white
        'ink-200':        '#cbd5e1',   // Slate 300
        'ink-300':        '#94a3b8',   // Slate 400
        'ink-400':        '#475569',   // Slate 600
        'ok':             '#0d9488',   // Teal 600
        'ok-dim':         'rgba(13,148,136,0.08)',
        'warn':           '#d97706',   // Amber 600
        'warn-dim':       'rgba(217,119,6,0.08)',
        'bad':            '#f43f5e',   // Rose 500
        'bad-dim':        'rgba(244,63,94,0.08)',
      },
      fontFamily: {
        'sans':    ['"Tajawal"', '"Inter"', 'system-ui', 'sans-serif'],
        'display': ['"Space Grotesk"', '"Tajawal"', 'sans-serif'],
        'mono':    ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
      },
    },
  },
};
