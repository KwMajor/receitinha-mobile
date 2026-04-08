import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { theme } from '../../constants/theme';
import { Rating } from '../../types';
import { submitRating } from '../../services/api/communityService';
import { StarRating } from './StarRating';
import { useAuthStore } from '../../store/authStore';

const MAX_CHARS = 500;

interface Props {
  visible: boolean;
  recipeId: string;
  /** Avaliação já existente do usuário (para edição) */
  existingRating?: Rating | null;
  onClose: () => void;
  /** Retorna a avaliação salva para o pai atualizar o estado */
  onSubmitted: (rating: Rating) => void;
}

function UserAvatar({ name }: { name: string }) {
  const initials = name
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

export const RateRecipeModal = ({
  visible,
  recipeId,
  existingRating,
  onClose,
  onSubmitted,
}: Props) => {
  const { user } = useAuthStore();
  const [stars, setStars] = useState(existingRating?.stars ?? 0);
  const [comment, setComment] = useState(existingRating?.comment ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sincroniza com avaliação existente quando o modal abre
  useEffect(() => {
    if (visible) {
      setStars(existingRating?.stars ?? 0);
      setComment(existingRating?.comment ?? '');
    }
  }, [visible, existingRating]);

  const handleSubmit = async () => {
    if (stars < 1) {
      Alert.alert('Selecione uma nota', 'Toque em uma estrela para avaliar a receita.');
      return;
    }
    setIsSubmitting(true);
    try {
      const saved = await submitRating(recipeId, stars, comment.trim() || undefined);
      onSubmitted(saved);
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível publicar a avaliação. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditing = !!existingRating;
  const remaining = MAX_CHARS - comment.length;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kvWrapper}
        pointerEvents="box-none"
      >
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Título */}
          <Text style={styles.title}>
            {isEditing ? 'Editar avaliação' : 'Avaliar receita'}
          </Text>

          {/* Avatar + nome do usuário */}
          {user && (
            <View style={styles.userRow}>
              <UserAvatar name={user.name || 'Usuário'} />
              <Text style={styles.userName}>{user.name || 'Usuário'}</Text>
            </View>
          )}

          {/* Estrelas interativas */}
          <View style={styles.starsContainer}>
            <StarRating value={stars} onChange={setStars} size="lg" />
            <Text style={styles.starsHint}>
              {stars === 0
                ? 'Toque para avaliar'
                : ['', 'Péssima', 'Ruim', 'Regular', 'Boa', 'Excelente!'][stars]}
            </Text>
          </View>

          {/* Comentário */}
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Comentário opcional…"
              placeholderTextColor={theme.colors.textSecondary}
              value={comment}
              onChangeText={(t) => setComment(t.slice(0, MAX_CHARS))}
              multiline
              maxLength={MAX_CHARS}
              textAlignVertical="top"
            />
            <Text style={[styles.charCount, remaining < 50 && styles.charCountWarn]}>
              {remaining} restantes
            </Text>
          </View>

          {/* Botões */}
          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isSubmitting}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, (stars < 1 || isSubmitting) && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={stars < 1 || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitText}>
                  {isEditing ? 'Salvar alterações' : 'Publicar avaliação'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  kvWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: theme.spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 36 : theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    alignSelf: 'center',
    marginBottom: theme.spacing.xs,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
  },
  starsContainer: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  starsHint: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    minHeight: 20,
  },
  inputWrapper: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  input: {
    fontSize: 15,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
    minHeight: 90,
    maxHeight: 160,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  charCount: {
    alignSelf: 'flex-end',
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  charCountWarn: {
    color: theme.colors.error,
  },
  buttons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  submitBtn: {
    flex: 2,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
