import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Modal, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { signOut, updateUserName, updateUserEmail } from '../../services/firebase/auth';
import { useAuthStore } from '../../store/authStore';
import { getRecipes } from '../../services/sqlite/recipeService';
import { countHistory } from '../../services/sqlite/cookingHistoryService';
import { getLastBackupTimestamp } from '../../services/firebase/backupService';
import { theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { ScreenHeader } from '../../components/common/ScreenHeader';

const getStyles = (colors: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  heroCard: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 20, fontWeight: "bold",
    marginBottom: theme.spacing.xs,
    color: colors.text,
  },
  email: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    paddingTop: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  section: {
    marginTop: theme.spacing.xl,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  logoutSection: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    marginLeft: theme.spacing.md,
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 44,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  logoutText: {
    fontSize: 16,
    color: colors.error,
    marginLeft: theme.spacing.md,
    fontWeight: '500',
  },
  badge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
    marginLeft: theme.spacing.sm,
  },
  editProfileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: theme.spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  inputLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: 16,
    marginBottom: theme.spacing.md,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export const ProfileScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [recipeCount, setRecipeCount] = useState(0);
  const [cookCount, setCookCount] = useState(0);
  const [backupOutdated, setBackupOutdated] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    if (user?.id) {
      const [recipes, cooked, lastBackup] = await Promise.all([
        getRecipes(user.id),
        countHistory(user.id),
        getLastBackupTimestamp(user.id),
      ]);
      setRecipeCount(recipes.length);
      setCookCount(cooked);
      const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
      setBackupOutdated(!lastBackup || Date.now() - lastBackup > SEVEN_DAYS);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user])
  );

  const openEditModal = () => {
    setEditName(user?.name || '');
    setEditEmail(user?.email || '');
    setEditModalVisible(true);
  };

  const handleSave = async () => {
    if (!editName.trim()) return Alert.alert('Nome obrigatório', 'Por favor, informe seu nome antes de salvar.');
    setSaving(true);
    try {
      if (editName.trim() !== user?.name) {
        await updateUserName(editName.trim());
      }
      if (editEmail.trim() !== user?.email) {
        await updateUserEmail(editEmail.trim());
        Alert.alert('Confirme seu novo e-mail', `Enviamos um link de confirmação para ${editEmail.trim()}. Acesse seu e-mail e clique no link para concluir a alteração.`);
      }
      const { setUser } = useAuthStore.getState();
      setUser({ ...user!, name: editName.trim(), email: editEmail.trim() });
      setEditModalVisible(false);
    } catch (error: any) {
      const msg = error?.code === 'auth/requires-recent-login'
        ? 'Por segurança, saia da conta e faça login novamente antes de alterar o e-mail.'
        : error?.code === 'auth/invalid-email'
        ? 'O e-mail informado não é válido. Verifique e tente novamente.'
        : error?.code === 'auth/email-already-in-use'
        ? 'Este e-mail já está em uso por outra conta.'
        : 'Não foi possível salvar as alterações. Tente novamente.';
      Alert.alert('Erro ao salvar', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair do Receitinha?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Sair', 
          style: 'destructive',
          onPress: async () => {
            await signOut();
          }
        }
      ]
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const MenuItem = ({ icon, title, onPress, showDivider = true, badge = false }: any) => (
    <>
      <TouchableOpacity style={styles.menuItem} onPress={onPress}>
        <View style={styles.menuItemLeft}>
          <Feather name={icon} size={20} color={colors.textSecondary} />
          <Text style={styles.menuItemText}>{title}</Text>
          {badge && <View style={styles.badge} />}
        </View>
        <Feather name="chevron-right" size={20} color={colors.border} />
      </TouchableOpacity>
      {showDivider && <View style={styles.divider} />}
    </>
  );

  const editBtn = (
    <TouchableOpacity style={styles.editProfileBtn} onPress={openEditModal} accessibilityLabel="Editar perfil" accessibilityRole="button">
      <Feather name="edit-2" size={16} color={colors.primary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Perfil" right={editBtn} />
      <ScrollView style={styles.container}>
      <View style={styles.heroCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name ? getInitials(user.name) : 'Us'}
          </Text>
        </View>
        <Text style={styles.name}>{user?.name || 'Usuário'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{recipeCount}</Text>
            <Text style={styles.statLabel}>Receitas Criadas</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{cookCount}</Text>
            <Text style={styles.statLabel}>Receitas Finalizadas</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <MenuItem 
          icon="book" 
          title="Minhas Receitas" 
          onPress={() => navigation.navigate('RecipeStack', { screen: 'RecipeList' })}
        />
        <MenuItem 
          icon="heart" 
          title="Favoritos" 
          onPress={() => navigation.navigate('FavoritesStack', { screen: 'FavoritesList' })} 
        />
        <MenuItem 
          icon="list" 
          title="Categorias" 
          onPress={() => navigation.navigate('Categories')} 
        />
        <MenuItem
          icon="clock"
          title="Histórico de Preparo"
          onPress={() => navigation.navigate('CookingHistory')}
        />
        <MenuItem
          icon="repeat"
          title="Conversor de Medidas"
          onPress={() => navigation.navigate('Converter')}
        />
        <MenuItem
          icon="cloud"
          title="Backup na nuvem"
          onPress={() => navigation.navigate('Backup')}
          badge={backupOutdated}
        />
        <MenuItem
          icon="moon"
          title="Aparência"
          onPress={() => navigation.navigate('Appearance')}
          showDivider={false}
        />
      </View>

      <View style={[styles.section, styles.logoutSection]}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
          <Feather name="log-out" size={20} color={colors.error} />
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={editModalVisible} animationType="slide" transparent onRequestClose={() => setEditModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setEditModalVisible(false)}>
          <TouchableOpacity style={styles.modalContent} activeOpacity={1} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Perfil</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Feather name="x" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Nome</Text>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={(text) => setEditName(text.replace(/[^\p{L}\p{M}\s]/gu, ''))}
              placeholder="Seu nome"
              returnKeyType="done"
            />

            <Text style={styles.inputLabel}>E-mail</Text>
            <TextInput
              style={styles.input}
              value={editEmail}
              onChangeText={setEditEmail}
              placeholder="Seu e-mail"
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="done"
            />

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveBtnText}>Salvar</Text>
              }
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
    </SafeAreaView>
  );
};

