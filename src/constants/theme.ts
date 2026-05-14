// ── Paleta de cores ──────────────────────────────────────────────────────────

const palette = {
  primary: '#FF6C37',
  primaryLight_light: '#FFEDE6',
  primaryLight_dark: '#3D1F14',
  success_light: '#34C759',
  success_dark: '#32D74B',
  warning_light: '#FF9500',
  warning_dark: '#FFD60A',
  error_light: '#FF3B30',
  error_dark: '#FF453A',
};

// ── Temas ─────────────────────────────────────────────────────────────────────

export const lightColors = {
  background:    '#FFFFFF',
  surface:       '#F5F5F5',
  card:          '#FFFFFF',
  border:        '#E0E0E0',
  text:          '#333333',
  textSecondary: '#666666',
  textTertiary:  '#999999',
  primary:       palette.primary,
  primaryLight:  palette.primaryLight_light,
  danger:        palette.error_light,
  error:         palette.error_light,
  success:       palette.success_light,
  warning:       palette.warning_light,
};

export const darkColors = {
  background:    '#121212',
  surface:       '#1E1E1E',
  card:          '#2C2C2C',
  border:        '#3A3A3A',
  text:          '#F0F0F0',
  textSecondary: '#A0A0A0',
  textTertiary:  '#6E6E6E',
  primary:       palette.primary,
  primaryLight:  palette.primaryLight_dark,
  danger:        palette.error_dark,
  error:         palette.error_dark,
  success:       palette.success_dark,
  warning:       palette.warning_dark,
};

// ── Escalas de fonte ──────────────────────────────────────────────────────────

export const fontSizes = {
  small:  { xs: 10, sm: 12, md: 14, lg: 16, xl: 18, xxl: 22, title: 26 },
  medium: { xs: 12, sm: 14, md: 16, lg: 18, xl: 20, xxl: 24, title: 30 },
  large:  { xs: 14, sm: 16, md: 18, lg: 20, xl: 22, xxl: 28, title: 34 },
};

// ── Tokens compartilhados ─────────────────────────────────────────────────────

const shared = {
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 40 },
  fonts:   { regular: 'System', medium: 'System', bold: 'System' },
  borderRadius: { sm: 4, md: 8, lg: 16, round: 9999 },
};

export const lightTheme = { ...shared, colors: lightColors };
export const darkTheme  = { ...shared, colors: darkColors };

// Exportação legada (compatibilidade com componentes ainda não migrados)
export const theme = lightTheme;
