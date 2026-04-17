import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useSettingsStore, ThemeOption, FontSizeOption, VoiceRateOption } from '../../store/settingsStore';

// ── Opções de tema ─────────────────────────────────────────────────────────────

interface ThemeCard {
  value: ThemeOption;
  label: string;
  icon:  'sun' | 'moon' | 'monitor';
  desc:  string;
}

const THEME_OPTIONS: ThemeCard[] = [
  { value: 'light',  label: 'Claro',   icon: 'sun',     desc: 'Sempre fundo claro' },
  { value: 'dark',   label: 'Escuro',  icon: 'moon',    desc: 'Sempre fundo escuro' },
  { value: 'system', label: 'Sistema', icon: 'monitor', desc: 'Segue o dispositivo' },
];

interface FontCard {
  value: FontSizeOption;
  label: string;
  letter: string;
  size:   number;
}

const FONT_OPTIONS: FontCard[] = [
  { value: 'small',  label: 'Pequeno', letter: 'A', size: 14 },
  { value: 'medium', label: 'Médio',   letter: 'A', size: 18 },
  { value: 'large',  label: 'Grande',  letter: 'A', size: 24 },
];

// ── Componente ─────────────────────────────────────────────────────────────────

const VOICE_RATE_OPTIONS: { value: VoiceRateOption; label: string }[] = [
  { value: 'slow',   label: 'Lenta'  },
  { value: 'normal', label: 'Normal' },
  { value: 'fast',   label: 'Rápida' },
];

export const AppearanceScreen: React.FC = () => {
  const { colors, fontSizes, spacing, borderRadius } = useTheme();
  const { theme, fontSize, voiceAutoRead, voiceRate, setTheme, setFontSize, setVoiceAutoRead, setVoiceRate } = useSettingsStore();

  const s = useStyles(colors, spacing, borderRadius);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >

        {/* ── SEÇÃO TEMA ── */}
        <Text style={[s.sectionTitle, { fontSize: fontSizes.sm }]}>TEMA</Text>

        <View style={s.themeRow}>
          {THEME_OPTIONS.map(opt => {
            const selected = theme === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[s.themeCard, selected && s.themeCardSelected]}
                onPress={() => setTheme(opt.value)}
                activeOpacity={0.75}
              >
                <View style={[
                  s.themeIconBg,
                  { backgroundColor: selected ? colors.primary : colors.surface },
                ]}>
                  <Feather
                    name={opt.icon}
                    size={22}
                    color={selected ? '#fff' : colors.textSecondary}
                  />
                </View>
                <Text style={[s.themeLabel, { color: selected ? colors.primary : colors.text, fontSize: fontSizes.sm }]}>
                  {opt.label}
                </Text>
                <Text style={[s.themeDesc, { fontSize: fontSizes.xs }]} numberOfLines={2}>
                  {opt.desc}
                </Text>
                {selected && (
                  <View style={s.themeCheck}>
                    <Feather name="check" size={12} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── SEÇÃO FONTE ── */}
        <Text style={[s.sectionTitle, { fontSize: fontSizes.sm, marginTop: spacing.lg }]}>TAMANHO DE FONTE</Text>

        <View style={s.fontRow}>
          {FONT_OPTIONS.map(opt => {
            const selected = fontSize === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[s.fontBtn, selected && s.fontBtnSelected]}
                onPress={() => setFontSize(opt.value)}
                activeOpacity={0.75}
              >
                <Text style={[
                  s.fontLetter,
                  { fontSize: opt.size, color: selected ? '#fff' : colors.text },
                ]}>
                  {opt.letter}
                </Text>
                <Text style={[
                  s.fontLabel,
                  { color: selected ? '#fff' : colors.textSecondary, fontSize: fontSizes.xs },
                ]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── PREVIEW DE TEXTO ── */}
        <View style={s.previewCard}>
          <Text style={[s.previewCaption, { fontSize: fontSizes.xs }]}>PRÉVIA</Text>
          <Text style={[s.previewTitle, { fontSize: fontSizes.xl }]}>
            Bolo de Chocolate
          </Text>
          <Text style={[s.previewBody, { fontSize: fontSizes.md }]}>
            Esta é a receita de bolo de chocolate com cobertura de brigadeiro. Uma delícia para qualquer ocasião!
          </Text>
          <View style={s.previewMeta}>
            <View style={s.previewMetaItem}>
              <Feather name="clock" size={fontSizes.md} color={colors.textSecondary} />
              <Text style={[s.previewMetaText, { fontSize: fontSizes.sm }]}>45 min</Text>
            </View>
            <View style={s.previewMetaItem}>
              <Feather name="users" size={fontSizes.md} color={colors.textSecondary} />
              <Text style={[s.previewMetaText, { fontSize: fontSizes.sm }]}>8 porções</Text>
            </View>
          </View>
        </View>

        {/* ── SEÇÃO VOZ ── */}
        <Text style={[s.sectionTitle, { fontSize: fontSizes.sm, marginTop: spacing.lg }]}>VOZ</Text>

        <View style={s.voiceCard}>
          <View style={s.voiceRow}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[s.voiceLabel, { fontSize: fontSizes.md }]}>Ler passos automaticamente</Text>
              <Text style={[s.voiceDesc, { fontSize: fontSizes.xs }]}>Lê cada passo em voz alta ao avançar no preparo</Text>
            </View>
            <Switch
              value={voiceAutoRead}
              onValueChange={setVoiceAutoRead}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={s.voiceDivider} />

          <Text style={[s.voiceRateLabel, { fontSize: fontSizes.xs }]}>VELOCIDADE DA FALA</Text>
          <View style={s.voiceRateRow}>
            {VOICE_RATE_OPTIONS.map(opt => {
              const selected = voiceRate === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[s.voiceRateBtn, selected && s.voiceRateBtnSelected]}
                  onPress={() => setVoiceRate(opt.value)}
                  activeOpacity={0.75}
                >
                  <Text style={[s.voiceRateBtnText, { fontSize: fontSizes.sm }, selected && s.voiceRateBtnTextSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── MINI RECIPE CARD ── */}
        <Text style={[s.sectionTitle, { fontSize: fontSizes.sm, marginTop: spacing.lg }]}>EXEMPLO DE CARD</Text>

        <View style={s.miniCard}>
          <View style={s.miniCardImage}>
            <Feather name="image" size={32} color={colors.textTertiary} />
            <View style={s.miniCardBadge}>
              <Text style={[s.miniCardBadgeText, { fontSize: fontSizes.xs }]}>Sobremesas</Text>
            </View>
          </View>
          <View style={s.miniCardBody}>
            <Text style={[s.miniCardTitle, { fontSize: fontSizes.lg }]} numberOfLines={2}>
              Bolo de Chocolate com Brigadeiro
            </Text>
            <View style={s.miniCardMeta}>
              <View style={s.previewMetaItem}>
                <Feather name="clock" size={fontSizes.sm} color={colors.textSecondary} />
                <Text style={[s.previewMetaText, { fontSize: fontSizes.sm }]}>45 min</Text>
              </View>
              <View style={s.previewMetaItem}>
                <Feather name="users" size={fontSizes.sm} color={colors.textSecondary} />
                <Text style={[s.previewMetaText, { fontSize: fontSizes.sm }]}>8 porções</Text>
              </View>
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

// ── Estilos dinâmicos ──────────────────────────────────────────────────────────

function useStyles(
  colors: ReturnType<typeof useTheme>['colors'],
  spacing: ReturnType<typeof useTheme>['spacing'],
  borderRadius: ReturnType<typeof useTheme>['borderRadius'],
) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      flex: 1,
    },
    content: {
      padding: spacing.md,
      paddingBottom: spacing.xxl,
    },
    sectionTitle: {
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      marginBottom: spacing.sm,
    },

    // Tema
    themeRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    themeCard: {
      flex: 1,
      alignItems: 'center',
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.border,
      gap: 6,
    },
    themeCardSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    themeIconBg: {
      width: 48,
      height: 48,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    themeLabel: {
      fontWeight: '700',
    },
    themeDesc: {
      color: colors.textSecondary,
      textAlign: 'center',
    },
    themeCheck: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Fonte
    fontRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    fontBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md,
      borderRadius: borderRadius.md,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.border,
      gap: 4,
    },
    fontBtnSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    fontLetter: {
      fontWeight: '800',
    },
    fontLabel: {
      fontWeight: '500',
    },

    // Preview
    previewCard: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    previewCaption: {
      fontWeight: '700',
      color: colors.textTertiary,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    previewTitle: {
      fontWeight: '700',
      color: colors.text,
    },
    previewBody: {
      color: colors.textSecondary,
      lineHeight: 22,
    },
    previewMeta: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    previewMetaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    previewMetaText: {
      color: colors.textSecondary,
    },

    // Mini card
    miniCard: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
    },
    miniCardImage: {
      height: 120,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    miniCardBadge: {
      position: 'absolute',
      top: spacing.sm,
      right: spacing.sm,
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: borderRadius.round,
    },
    miniCardBadgeText: {
      color: '#fff',
      fontWeight: '700',
    },
    miniCardBody: {
      padding: spacing.md,
      gap: spacing.sm,
    },
    miniCardTitle: {
      fontWeight: '700',
      color: colors.text,
    },
    miniCardMeta: {
      flexDirection: 'row',
      gap: spacing.md,
    },

    // Voz
    voiceCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      gap: spacing.md,
    },
    voiceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    voiceLabel: {
      fontWeight: '600',
      color: colors.text,
    },
    voiceDesc: {
      color: colors.textSecondary,
    },
    voiceDivider: {
      height: 1,
      backgroundColor: colors.border,
    },
    voiceRateLabel: {
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    voiceRateRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    voiceRateBtn: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
      backgroundColor: colors.background,
      borderWidth: 2,
      borderColor: colors.border,
    },
    voiceRateBtnSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    voiceRateBtnText: {
      fontWeight: '600',
      color: colors.text,
    },
    voiceRateBtnTextSelected: {
      color: '#fff',
    },
  });
}
