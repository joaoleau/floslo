const { hairlineWidth } = require('nativewind/theme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/app/**/*.{ts,tsx}', './src/components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    // Inter (carregada em app/_layout.tsx via @expo-google-fonts/inter) é mais fina e legível
    // que a fonte padrão do sistema, que era a única opção antes. RN não sintetiza pesos a
    // partir de um único arquivo -- cada peso do Inter é seu próprio arquivo, então o
    // font-weight numérico do Tailwind não muda nada sozinho no nativo. Por isso os pesos
    // abaixo apontam pra fontFamily (não fontWeight): toda className existente no app
    // (font-medium/font-semibold/font-bold/font-extrabold) passa a resolver pro corte certo
    // do Inter automaticamente, sem precisar tocar em cada tela.
    fontFamily: {
      sans: ['Inter_400Regular'],
    },
    extend: {
      fontWeight: {
        normal: 'Inter_400Regular',
        medium: 'Inter_500Medium',
        semibold: 'Inter_600SemiBold',
        bold: 'Inter_700Bold',
        extrabold: 'Inter_800ExtraBold',
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        brand: {
          50: 'hsl(var(--brand-soft))',
          100: 'hsl(var(--brand))',
          foreground: 'hsl(var(--brand-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--brand-foreground))',
        },
      },
      // Literal (not CSS-var-derived) so radius stays correct even though NativeWind's
      // native runtime can't reliably resolve calc(var(...)) for style properties.
      borderRadius: {
        lg: '1rem',
        md: '0.875rem',
        sm: '0.75rem',
      },
      borderWidth: {
        hairline: hairlineWidth(),
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  future: {
    hoverOnlyWhenSupported: true,
  },
  plugins: [require('tailwindcss-animate')],
};
