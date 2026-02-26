const palette = {
  navy50: '#EEF0F8',
  navy100: '#D5D9EE',
  navy200: '#A6AEDD',
  navy300: '#7783CC',
  navy400: '#4857BB',
  navy500: '#1A1F36',
  navy600: '#161A2E',
  navy700: '#111426',
  navy800: '#0C0F1E',
  navy900: '#070A16',

  amber50: '#FFF9EC',
  amber100: '#FFF0CC',
  amber200: '#FFE099',
  amber300: '#FFD066',
  amber400: '#F5A623',
  amber500: '#D4900F',
  amber600: '#B37A0C',

  emerald: '#10B981',
  rose: '#F43F5E',
  sky: '#38BDF8',
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',
  slate300: '#CBD5E1',
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1E293B',
  slate900: '#0F172A',
};

const Colors = {
  light: {
    tint: palette.amber400,
    accent: palette.amber400,
    primary: palette.navy500,

    background: '#F8F9FC',
    backgroundSecondary: '#FFFFFF',
    backgroundTertiary: palette.slate100,

    card: '#FFFFFF',
    cardBorder: palette.slate200,

    text: palette.navy500,
    textSecondary: palette.slate500,
    textTertiary: palette.slate400,

    tabIconDefault: palette.slate400,
    tabIconSelected: palette.amber400,

    separator: palette.slate200,
    placeholder: palette.slate400,

    success: palette.emerald,
    danger: palette.rose,
    warning: palette.amber400,
    info: palette.sky,

    overlay: 'rgba(0,0,0,0.4)',
  },
  dark: {
    tint: palette.amber400,
    accent: palette.amber400,
    primary: '#E8EDF5',

    background: '#0D1117',
    backgroundSecondary: '#161B27',
    backgroundTertiary: '#1C2333',

    card: '#161B27',
    cardBorder: '#252D3D',

    text: '#E8EDF5',
    textSecondary: '#94A3B8',
    textTertiary: '#64748B',

    tabIconDefault: '#64748B',
    tabIconSelected: palette.amber400,

    separator: '#252D3D',
    placeholder: '#64748B',

    success: '#34D399',
    danger: '#FB7185',
    warning: palette.amber400,
    info: palette.sky,

    overlay: 'rgba(0,0,0,0.65)',
  },
};

export default Colors;
