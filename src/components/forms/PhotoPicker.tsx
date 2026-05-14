import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

interface PhotoPickerProps {
  imageUri: string | null;
  onChange: (uri: string) => void;
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    height: 200,
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  placeholderContainer: {
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: theme.spacing.sm,
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  editBadge: {
    position: 'absolute',
    bottom: theme.spacing.md,
    right: theme.spacing.md,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.round,
  }
});

export const PhotoPicker = ({ imageUri, onChange }: PhotoPickerProps) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const handlePick = () => {
    Alert.alert('Selecionar Foto', 'Escolha a origem da foto', [
      { text: 'Câmera', onPress: openCamera },
      { text: 'Galeria', onPress: openGallery },
      { text: 'Cancelar', style: 'cancel' }
    ]);
  };

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permissão necessária', 'Para tirar uma foto, permita o acesso à câmera nas configurações do dispositivo.');

    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      onChange(result.assets[0].uri);
    }
  };

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permissão necessária', 'Para escolher uma foto, permita o acesso à galeria nas configurações do dispositivo.');

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      onChange(result.assets[0].uri);
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePick}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.image} />
      ) : (
        <View style={styles.placeholderContainer}>
          <Feather name="camera" size={32} color={colors.textSecondary} />
          <Text style={styles.placeholderText}>Adicionar Foto</Text>
        </View>
      )}
      {imageUri && (
        <View style={styles.editBadge}>
          <Feather name="edit-2" size={16} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
};
