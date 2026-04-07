import React, { useState, useCallback } from 'react';
import {
  Alert,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { getHistoryGrouped, deleteHistoryEntry, GroupedHistory } from '../../services/sqlite/cookingHistoryService';
import { HistoryEntry } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { theme } from '../../constants/theme';
import { SkeletonCard } from '../../components/common/SkeletonCard';

function RecipeInitial({ title }: { title: string }) {
  const initial = title.trim()[0]?.toUpperCase() ?? '?';
  return (
    <View style={[styles.thumbnail, styles.placeholderThumb]}>
      <Text style={styles.placeholderInitial}>{initial}</Text>
    </View>
  );
}

export const CookingHistoryScreen = () => {
  const [sections, setSections] = useState<GroupedHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuthStore();
  const navigation = useNavigation<any>();

  const loadData = useCallback(async (isRefresh = false) => {
    if (!user) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const grouped = await getHistoryGrouped(user.id);
      setSections(grouped);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar o histórico. Tente novamente.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => { loadData(); }, [loadData])
  );

  const handleDelete = async (id: string) => {
    try {
      await deleteHistoryEntry(id);
      setSections(prev =>
        prev
          .map(s => ({ ...s, data: s.data.filter(e => e.id !== id) }))
          .filter(s => s.data.length > 0)
      );
    } catch {
      Alert.alert('Erro', 'Não foi possível remover este item. Tente novamente.');
    }
  };

  const renderRightActions = (id: string) => (
    <TouchableOpacity style={styles.deleteAction} onPress={() => handleDelete(id)}>
      <Feather name="trash-2" size={22} color="#fff" />
      <Text style={styles.deleteText}>Excluir</Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: HistoryEntry }) => {
    const recipe = item.recipe;
    const timeString = new Date(item.cookedAt).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <Swipeable renderRightActions={() => renderRightActions(item.id)}>
        <TouchableOpacity
          style={styles.historyItem}
          onPress={() => recipe && navigation.navigate('RecipeDetail', { recipeId: recipe.id })}
          disabled={!recipe}
          activeOpacity={0.75}
        >
          {recipe?.photoUrl ? (
            <Image source={{ uri: recipe.photoUrl }} style={styles.thumbnail} />
          ) : (
            <RecipeInitial title={recipe?.title ?? '?'} />
          )}

          <View style={styles.itemContent}>
            <View style={styles.itemHeader}>
              <Text style={styles.recipeTitle} numberOfLines={1}>
                {recipe ? recipe.title : 'Receita excluída'}
              </Text>
            </View>

            <View style={styles.row}>
              <Feather name="clock" size={12} color={theme.colors.textSecondary} />
              <Text style={styles.timeText}>às {timeString}</Text>
            </View>

            {item.notes ? (
              <Text style={styles.notesText} numberOfLines={2}>"{item.notes}"</Text>
            ) : null}
          </View>

          <Feather name="chevron-right" size={16} color={theme.colors.border} />
        </TouchableOpacity>
      </Swipeable>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </View>
    );
  }

  if (sections.length === 0) {
    return (
      <View style={styles.center}>
        <Feather name="clock" size={52} color={theme.colors.textSecondary} />
        <Text style={styles.emptyTitle}>Nenhuma receita preparada</Text>
        <Text style={styles.emptySubtitle}>
          Quando você concluir uma receita no modo de preparo, ela aparecerá aqui.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
        stickySectionHeadersEnabled
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  center: {
    flex: 1,
    padding: theme.spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  thumbnail: {
    width: 52,
    height: 52,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.md,
  },
  placeholderThumb: {
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderInitial: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: 4,
  },
  recipeTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.text,
    flex: 1,
  },
  countBadge: {
    backgroundColor: theme.colors.primary + '22',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  notesText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  deleteAction: {
    backgroundColor: theme.colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    gap: 4,
  },
  deleteText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
});
