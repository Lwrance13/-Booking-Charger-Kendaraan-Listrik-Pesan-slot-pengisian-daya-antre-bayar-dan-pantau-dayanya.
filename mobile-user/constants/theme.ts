// Design tokens extracted from DESIGN (2).md — Emerald Charge Admin System

export const colors = {
  // Primary — Deep Forest Green
  primary: '#00362D',
  primaryContainer: '#1A4D43',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#8ABDB0',
  inversePrimary: '#9ED1C3',

  // Secondary — Terracotta Red (alerts, errors, stop actions)
  secondary: '#B51A1E',
  secondaryContainer: '#D93633',
  onSecondary: '#FFFFFF',

  // Tertiary — Amber Yellow (warnings, maintenance, pending)
  tertiary: '#402A00',
  tertiaryContainer: '#5D3F00',
  onTertiary: '#FFFFFF',
  amber: '#EBA500',

  // Error
  error: '#BA1A1A',
  onError: '#FFFFFF',
  errorContainer: '#FFDAD6',

  // Surfaces
  background: '#F8FAF9',
  surface: '#F8FAF9',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F2F4F3',
  surfaceContainer: '#ECEEED',
  surfaceContainerHigh: '#E6E9E8',
  white: '#FFFFFF',

  // Text
  onSurface: '#191C1C',
  onSurfaceVariant: '#404946',
  inverseOnSurface: '#EFF1F0',

  // Borders
  outline: '#707976',
  outlineVariant: '#C0C8C5',

  // Status chip backgrounds (low-opacity tints)
  chipOnlineBg: '#DFF2EE',
  chipOnlineText: '#1A4D43',
  chipOfflineBg: '#FDECEA',
  chipOfflineText: '#B51A1E',
  chipMaintenanceBg: '#FFF8E1',
  chipMaintenanceText: '#5D3F00',
  chipReservedBg: '#E8F0FE',
  chipReservedText: '#1558D6',
  chipAvailableBg: '#DFF2EE',
  chipAvailableText: '#1A4D43',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 24,
  full: 9999,
};

export const shadow = {
  card: {
    shadowColor: '#1A4D43',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 2,
  },
  overlay: {
    shadowColor: '#1A4D43',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 6,
  },
};

// Typography uses Inter font family (loaded via expo-font)
export const typography = {
  headlineXl: { fontSize: 48, fontWeight: '700' as const, lineHeight: 56, letterSpacing: -0.96 },
  headlineLg: { fontSize: 32, fontWeight: '600' as const, lineHeight: 40, letterSpacing: -0.32 },
  headlineMd: { fontSize: 24, fontWeight: '600' as const, lineHeight: 32 },
  bodyLg: { fontSize: 18, fontWeight: '400' as const, lineHeight: 28 },
  bodyMd: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodySm: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  labelLg: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20, letterSpacing: 0.7 },
  labelMd: { fontSize: 12, fontWeight: '500' as const, lineHeight: 16 },
  labelSm: { fontSize: 11, fontWeight: '500' as const, lineHeight: 14 },
};
