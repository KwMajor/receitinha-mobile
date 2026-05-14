import { Camera } from 'expo-camera';
import { Alert, Linking } from 'react-native';

export async function requestCameraPermission(): Promise<boolean> {
  const { status } = await Camera.getCameraPermissionsAsync();

  if (status === 'granted') return true;

  const { status: newStatus } = await Camera.requestCameraPermissionsAsync();

  if (newStatus === 'granted') return true;

  Alert.alert(
    'Permissão necessária',
    'O acesso à câmera é necessário para escanear códigos de barras.',
    [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Abrir Configurações', onPress: () => Linking.openSettings() },
    ]
  );

  return false;
}
