import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { getHistory, deleteFromHistory } from '../../services/sqlite/cookingHistoryService';
import { HistoryEntry } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { theme } from '../../constants/theme';
import { SkeletonCard } from '../../components/common/SkeletonCard';

export const CookingHistoryScreen = () => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const navigation = useNavigation<any>();

  const loadHistory = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await getHistory(user.id);
      setHistory(data);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar o histórico.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [user])
  );

  const handleDelete = async (id: string) => {
    try {
      await deleteFromHistory(id);
      setHistory(prev => prev.filter(h => h.id !== id));
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível remover o item.');
    }
  };

  const groupHistoryByDate = (historyItems: HistoryEntry[]) => {
    const groups: { [key: string]: HistoryEntry[] } = {};
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    historyItems.forEach(item => {
      const itemDate = new Date(item.cookedAt).toDateString();
      let label = itemDate;
      if (itemDate === today) label = 'Hoje';
      else if (itemDate === yesterday) label = 'Ontem';
      else label = new Date(item.cookedAt).toLocaleDateString('pt-BR');

      if (!groups[label]) groups[label] = [];
      groups[label].push(item);
    });

    return Object.entries(groups).map(([title, data]) => ({ title, data }));
  };

  const renderRightActions = (id: string) => {
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => handleDelete(id)}
      >
        <Feather name="trash-2" size={24} color="#fff" />
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }: { item: HistoryEntry }) => {
    const recipe = item.recipe;
    const timeString = new Date(item.cookedAt).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    return (
      <Swipeable renderRightActions={() => renderRightActions(item.id)}>
        <TouchableOpacity 
          style={styles.historyItem}
          onPress={() => recipe && navigation.navigate('RecipeDetail', { id: recipe.id })}
          disabled={!recipe}
        >
          {recipe?.photoUrl || (recipe as any)?.photo_url ? (
             <Image source={{ uri: recipe.photoUrl || (recipe as any)?.photo_url }} style={styles.thumbnail} />
          ) : (
             <View style={[styles.thumbnail, styles.placeholderThumb]}>
               <Feather name="image" size={24} color={theme.colors.textSecondary} />
             </View>
          )}
          
          <View style={styles.itemContent}>
            <Text style={styles.recipeTitle} numberOfLines={1}>
              {recipe ? recipe.title : 'Receita Excluída'}
            </Text>
            <View style={styles.row}>
              <Feather name="clock" size={12} color={theme.colors.textSecondary} />
              <Text style={styles.timeText}>{timeString}</Text>
            </View>
            {item.notes ? (
              <Text style={styles.notesText} numberOfLines={2}>"{item.notes}"</Text>
            ) : null}
          </View>
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

  const groupedData = groupHistoryByDate(history);

  if (groupedData.length === 0) {
    return (
      <View style={styles.center}>
        <Feather name="clock" size={48} color={theme.colors.textSecondary} />
        <Text style={styles.emptyText}>Você ainda não preparou nenhuma receita.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={groupedData}
        keyExtractor={(item) => item.title}
        renderItem={({ item: group }) => (
          <View>
            <Text style={styles.sectionHeader}>{group.title}</Text>
            {group.data.map(entry => (
              <React.Fragment key={entry.id}>
                {renderItem({ item: entry })}
              </React.Fragment>
            ))}
          </View>
        )}
        contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
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
    padding: theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    fontSize: 16, fontWeight: "bold",
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  historyItem: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.md,
  },
  placeholderThumb: {
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
    justifyContent: 'center',
  },
  recipeTitle: {
    fontSize: 16, fontWeight: "bold",
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 4,
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
    height: '100%',
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  }
});
