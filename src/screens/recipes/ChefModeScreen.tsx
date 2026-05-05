import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Alert,
  Animated,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import * as Brightness from 'expo-brightness';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { theme } from '../../constants/theme';
import { addToHistory } from '../../services/sqlite/cookingHistoryService';
import { deductRecipeIngredients } from '../../services/sqlite/pantryService';
import { useAuthStore } from '../../store/authStore';
import { useTimersStore } from '../../store/timersStore';
import { Recipe } from '../../types';

const formatTime = (totalSeconds: number) => {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export const ChefModeScreen = () => {
  useKeepAwake();

  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { recipe } = route.params as { recipe: Recipe };
  const { user } = useAuthStore();
  const { addTimer, startTimer, pauseTimer, resumeTimer, removeTimer, timers, setCookingMode } = useTimersStore();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showDone, setShowDone] = useState(false);

  const steps = recipe.steps || [];
  const currentStep = steps[currentStepIndex];
  const timerMinutes = currentStep?.timer_minutes || 0;

  const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
  const prevDoneRef = useRef(false);
  const originalBrightness = useRef<number | null>(null);

  const activeTimer = timers.find(t => t.id === activeTimerId) ?? null;
  const seconds = activeTimer?.remainingSeconds ?? timerMinutes * 60;
  const isRunning = activeTimer?.isRunning ?? false;
  const isDone = activeTimer?.isDone ?? false;

  const [isFlashing, setIsFlashing] = useState(false);

  // Brilho automático máximo ao entrar, restaura ao sair
  useEffect(() => {
    let cancelled = false;
    Brightness.getPermissionsAsync().then(async ({ status }) => {
      if (cancelled) return;
      if (status !== 'granted') {
        const { status: newStatus } = await Brightness.requestPermissionsAsync();
        if (newStatus !== 'granted') return;
      }
      const current = await Brightness.getBrightnessAsync();
      originalBrightness.current = current;
      await Brightness.setBrightnessAsync(1.0);
    }).catch(() => {});

    return () => {
      cancelled = true;
      if (originalBrightness.current !== null) {
        Brightness.setBrightnessAsync(originalBrightness.current).catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    setCookingMode(true);
    return () => setCookingMode(false);
  }, [setCookingMode]);

  useEffect(() => {
    if (isDone && !prevDoneRef.current) {
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 2000);
    }
    prevDoneRef.current = isDone;
  }, [isDone]);

  useEffect(() => {
    setActiveTimerId(null);
  }, [currentStepIndex]);

  const startTimerFn = () => {
    if (!activeTimerId) {
      const secs = timerMinutes * 60;
      if (secs <= 0) return;
      const id = addTimer(`${recipe.title} — Passo ${currentStepIndex + 1}`, secs);
      setActiveTimerId(id);
      startTimer(id);
    } else {
      resumeTimer(activeTimerId);
    }
  };

  const pauseTimerFn = () => {
    if (activeTimerId) pauseTimer(activeTimerId);
  };

  const resetTimerFn = () => {
    if (activeTimerId) {
      removeTimer(activeTimerId);
      setActiveTimerId(null);
    }
  };

  const handleNext = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      setShowDone(true);
    }
  }, [currentStepIndex, steps.length]);

  const handlePrev = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [currentStepIndex]);

  const handleClose = () => {
    Alert.alert('Sair do Modo Chef', 'Tem certeza que quer sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => navigation.goBack() },
    ]);
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
      await Promise.all([
        user ? addToHistory(user.id, recipe.id) : Promise.resolve(),
        user && ingredients.length > 0
          ? deductRecipeIngredients(user.id, ingredients)
          : Promise.resolve(),
      ]);
    } finally {
      setSaving(false);
      navigation.goBack();
    }
  };

  // Swipe esquerda → próximo, direita → anterior
  const onGestureEvent = (event: any) => {
    const { translationX, state } = event.nativeEvent;
    if (state === State.END) {
      if (translationX < -60) handleNext();
      else if (translationX > 60) handlePrev();
    }
  };

  const slideAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: 30, duration: 0, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, friction: 8 }),
    ]).start();
  }, [currentStepIndex]);

  if (!steps.length) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.noSteps}>Esta receita não possui passos cadastrados.</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Feather name="x" size={28} color="#fff" />
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const progress = ((currentStepIndex + 1) / steps.length) * 100;
  const isCloseToZero = seconds > 0 && seconds <= 10;
  const showTimer = timerMinutes > 0;

  if (showDone) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar hidden />
        <View style={styles.doneContainer}>
          <Text style={styles.doneEmoji}>🎉</Text>
          <Text style={styles.doneTitle}>Receita concluída!</Text>
          <Text style={styles.doneSubtitle}>{recipe.title}</Text>
          <TouchableOpacity
            style={[styles.bigBtn, { marginTop: 40 }]}
            onPress={handleFinish}
            disabled={saving}
          >
            <Text style={styles.bigBtnText}>{saving ? 'Salvando...' : 'Salvar e sair'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ marginTop: 20 }} onPress={() => navigation.goBack()}>
            <Text style={styles.skipText}>Sair sem registrar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isFlashing && styles.containerFlash]}>
      <StatusBar hidden />

      {/* HEADER compacto */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Feather name="x" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.recipeTitle} numberOfLines={1}>{recipe.title}</Text>
          <View style={styles.stepCounter}>
            <Text style={styles.stepCounterText}>{currentStepIndex + 1}/{steps.length}</Text>
          </View>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>

      {/* ÁREA CENTRAL — texto grande */}
      <PanGestureHandler onHandlerStateChange={onGestureEvent}>
        <View style={styles.centerArea}>
          <ScrollView contentContainerStyle={styles.centerScroll}>
            <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumber}>{currentStepIndex + 1}</Text>
              </View>
              <Text style={styles.instruction}>{currentStep?.instruction}</Text>
            </Animated.View>

            {showTimer && (
              <View style={styles.timerZone}>
                <Text style={[
                  styles.timerDisplay,
                  isCloseToZero && styles.timerDanger,
                  isDone && styles.timerDone,
                ]}>
                  {formatTime(seconds)}
                </Text>
                <View style={styles.timerRow}>
                  {!isRunning ? (
                    <TouchableOpacity style={styles.bigTimerBtn} onPress={startTimerFn}>
                      <Feather name="play" size={32} color="#fff" />
                      <Text style={styles.bigTimerBtnText}>Iniciar</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={[styles.bigTimerBtn, styles.pauseBtn]} onPress={pauseTimerFn}>
                      <Feather name="pause" size={32} color="#fff" />
                      <Text style={styles.bigTimerBtnText}>Pausar</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.resetBtn} onPress={resetTimerFn}>
                    <Feather name="refresh-ccw" size={24} color="#aaa" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </PanGestureHandler>

      {/* SWIPE HINT */}
      <Text style={styles.swipeHint}>← deslize para navegar →</Text>

      {/* BOTÕES GRANDES */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.bigNavBtn, currentStepIndex === 0 && styles.disabledBtn]}
          onPress={handlePrev}
          disabled={currentStepIndex === 0}
        >
          <Feather name="arrow-left" size={32} color={currentStepIndex === 0 ? '#444' : '#fff'} />
          <Text style={[styles.bigNavBtnText, currentStepIndex === 0 && { color: '#444' }]}>Anterior</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bigNavBtn, styles.nextBtn]}
          onPress={handleNext}
        >
          <Text style={[styles.bigNavBtnText, { color: '#121212' }]}>
            {currentStepIndex === steps.length - 1 ? 'Concluir' : 'Próximo'}
          </Text>
          {currentStepIndex < steps.length - 1 && (
            <Feather name="arrow-right" size={32} color="#121212" />
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  containerFlash: {
    backgroundColor: theme.colors.error,
  },
  noSteps: {
    color: '#fff',
    fontSize: 20,
    textAlign: 'center',
    margin: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 32 : 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  closeBtn: {
    padding: 4,
    marginRight: 12,
  },
  recipeTitle: {
    flex: 1,
    color: '#999',
    fontSize: 18,
    fontWeight: '600',
  },
  stepCounter: {
    backgroundColor: '#222',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  stepCounterText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#222',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
  },
  centerArea: {
    flex: 1,
  },
  centerScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  stepNumberBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,107,107,0.12)',
    borderWidth: 3,
    borderColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 32,
  },
  stepNumber: {
    color: theme.colors.primary,
    fontSize: 34,
    fontWeight: 'bold',
  },
  instruction: {
    color: '#F5F5F5',
    fontSize: 36,
    lineHeight: 52,
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  timerZone: {
    alignItems: 'center',
    marginTop: 48,
  },
  timerDisplay: {
    color: '#fff',
    fontSize: 72,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
    marginBottom: 24,
  },
  timerDanger: {
    color: theme.colors.error,
  },
  timerDone: {
    color: theme.colors.success,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  bigTimerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 36,
    paddingVertical: 18,
    borderRadius: 40,
  },
  pauseBtn: {
    backgroundColor: '#444',
  },
  bigTimerBtnText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  resetBtn: {
    padding: 18,
    backgroundColor: '#1E1E1E',
    borderRadius: 40,
  },
  swipeHint: {
    color: '#333',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
  },
  bigNavBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 20,
    borderRadius: 16,
    backgroundColor: '#1E1E1E',
  },
  disabledBtn: {
    opacity: 0.4,
  },
  nextBtn: {
    backgroundColor: '#fff',
    flex: 1.5,
  },
  bigNavBtnText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  // Tela de conclusão
  doneContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  doneEmoji: {
    fontSize: 80,
  },
  doneTitle: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 24,
    textAlign: 'center',
  },
  doneSubtitle: {
    color: '#aaa',
    fontSize: 18,
    marginTop: 8,
    textAlign: 'center',
  },
  bigBtn: {
    width: '100%',
    backgroundColor: theme.colors.primary,
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  bigBtnText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  skipText: {
    color: '#555',
    fontSize: 16,
  },
});
