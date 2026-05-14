import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

const SIZE_LIMIT_BYTES = 50 * 1024 * 1024; // 50 MB

interface VideoPickerProps {
  videoUri: string | null;
  onChange: (uri: string | null) => void;
}

export const VideoPicker: React.FC<VideoPickerProps> = ({ videoUri, onChange }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  useEffect(() => {
    if (!videoUri) { setThumbnail(null); return; }
    // Only generate thumbnail for local URIs (remote URLs handled by VideoPlayer)
    if (videoUri.startsWith('http')) { setThumbnail(null); return; }
    VideoThumbnails.getThumbnailAsync(videoUri, { time: 500 })
      .then(({ uri }) => setThumbnail(uri))
      .catch(() => setThumbnail(null));
  }, [videoUri]);

  const handlePick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Para escolher um vídeo, permita o acesso à galeria nas configurações do dispositivo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: false,
      quality: 1,
    });

    if (result.canceled || !result.assets[0]?.uri) return;

    const uri = result.assets[0].uri;

    const info = await FileSystem.getInfoAsync(uri);
    const size = info.exists ? (info as any).size ?? 0 : 0;

    if (size > SIZE_LIMIT_BYTES) {
      Alert.alert(
        'Vídeo muito grande',
        'O vídeo tem mais de 50 MB. O upload pode ser lento dependendo da conexão. Deseja continuar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Continuar', onPress: () => onChange(uri) },
        ],
      );
    } else {
      onChange(uri);
    }
  };

  if (!videoUri) {
    return (
      <TouchableOpacity style={styles.addBtn} onPress={handlePick}>
        <Feather name="video" size={18} color={colors.primary} />
        <Text style={styles.addBtnText}>Adicionar Vídeo</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.preview}>
      {thumbnail ? (
        <Image source={{ uri: thumbnail }} style={styles.thumbnail} />
      ) : (
        <View style={[styles.thumbnail, styles.thumbPlaceholder]}>
          <Feather name="video" size={28} color={colors.textSecondary} />
        </View>
      )}
      <View style={styles.previewInfo}>
        <Text style={styles.previewLabel} numberOfLines={1}>
          {videoUri.startsWith('http') ? 'Vídeo atual' : 'Vídeo selecionado'}
        </Text>
        <TouchableOpacity style={styles.removeBtn} onPress={() => onChange(null)}>
          <Feather name="x" size={14} color={colors.error} />
          <Text style={styles.removeBtnText}>Remover vídeo</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
  },
  addBtnText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumbnail: {
    width: 72,
    height: 54,
    borderRadius: theme.borderRadius.sm,
    resizeMode: 'cover',
  },
  thumbPlaceholder: {
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewInfo: {
    flex: 1,
    gap: 6,
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  removeBtnText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: '500',
  },
});
