import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { Rating } from '../../types';
import { StarRating } from './StarRating';

function formatRelativeDate(iso: string | undefined): string {
  if (!iso) return '';
  const diffMs  = Date.now() - new Date(iso).getTime();
  const diffMin  = Math.floor(diffMs / 60_000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay  = Math.floor(diffHour / 24);

  if (diffDay > 30)
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  if (diffDay > 0) return `há ${diffDay} ${diffDay === 1 ? 'dia' : 'dias'}`;
  if (diffHour > 0) return `há ${diffHour} ${diffHour === 1 ? 'hora' : 'horas'}`;
  if (diffMin > 0) return `há ${diffMin} min`;
  return 'agora mesmo';
}

const getStyles = (colors: any) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  headerInfo: { flex: 1 },
  authorName: { fontSize: 14, fontWeight: 'bold', color: colors.text },
  date: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  comment: { fontSize: 14, color: colors.text, lineHeight: 20 },
  toggleText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
});

function AuthorAvatar({ name, colors }: { name: string | undefined; colors: any }) {
  const styles = getStyles(colors);
  const initials = (name ?? '')
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{initials}</Text>
    </View>
  );
}

interface Props {
  rating: Rating;
}

const MAX_LINES = 3;

export const RatingCard = ({ rating }: Props) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [expanded, setExpanded] = useState(false);
  const hasLongComment = (rating.comment?.length ?? 0) > 160;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <AuthorAvatar name={rating.authorName} colors={colors} />
        <View style={styles.headerInfo}>
          <Text style={styles.authorName}>{rating.authorName}</Text>
          <Text style={styles.date}>{formatRelativeDate(rating.createdAt)}</Text>
        </View>
        <StarRating value={rating.stars} readonly size="sm" />
      </View>

      {rating.comment ? (
        <>
          <Text
            style={styles.comment}
            numberOfLines={expanded ? undefined : MAX_LINES}
          >
            {rating.comment}
          </Text>
          {hasLongComment && (
            <TouchableOpacity onPress={() => setExpanded((v) => !v)}>
              <Text style={styles.toggleText}>
                {expanded ? 'Ver menos' : 'Ver mais'}
              </Text>
            </TouchableOpacity>
          )}
        </>
      ) : null}
    </View>
  );
};
