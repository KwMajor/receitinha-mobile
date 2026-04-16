import { Platform } from 'react-native';

let Notifications: typeof import('expo-notifications') | null = null;
let isNotificationsDisabled = false;

try {
  // No Expo SDK 53+, rodar o expo-notifications no Android pelo Expo Go
  // lança um erro na inicialização pois o suporte a push nativo foi removido.
  Notifications = require('expo-notifications');
  
  if (Notifications) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }
} catch (e) {
  isNotificationsDisabled = true;
  console.warn('⚠️ expo-notifications foi desativado pois você está usando o Expo Go no Android (SDK >= 53). Para testar notificações, gere uma development build (npx expo run:android).');
}

export const requestPermissions = async (): Promise<boolean> => {
  if (isNotificationsDisabled || !Notifications) return false;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Padrão',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return finalStatus === 'granted';
};

export const scheduleTimerNotification = async (stepTitle: string, seconds: number): Promise<string> => {
  if (isNotificationsDisabled || !Notifications) return 'mock-id';

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Tempo Esgotado! ⏰',
      body: `O passo "${stepTitle}" acabou de terminar.`,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.MAX,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
    },
  });
  return id;
};

export const cancelNotification = async (id: string): Promise<void> => {
  if (isNotificationsDisabled || !Notifications || id === 'mock-id') return;

  await Notifications.cancelScheduledNotificationAsync(id);
};

export const notifyTimerComplete = async (label: string): Promise<void> => {
  if (isNotificationsDisabled || !Notifications) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '⏰ Timer concluído!',
      body: label,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.MAX,
    },
    trigger: null, // dispara imediatamente
  });
};
