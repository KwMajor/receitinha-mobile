import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { addToHistory, getRecipeStats } from '../../services/sqlite/cookingHistoryService';
import { deductRecipeIngredients } from '../../services/sqlite/pantryService';
import { useAuthStore } from '../../store/authStore';
import { useTimersStore } from '../../store/timersStore';
import { Recipe } from '../../types';
const MAX_NOTE = 200;

const formatTime = (totalSeconds: number) => {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const ordinalFem = (n: number) => `${n}ª`;

export const CookingScreen = () => {
  useKeepAwake();

  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { recipe } = route.params as { recipe: Recipe };
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const steps = recipe.steps || [];
  const currentStep = steps[currentStepIndex];
  const timerMinutes = currentStep?.timer_minutes || 0;

  // Flash de fundo
  const [isFlashing, setIsFlashing] = useState(false);

  // Quantas vezes o usuário já preparou esta receita
  const [timesCooked, setTimesCooked] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    getRecipeStats(user.id, recipe.id).then(s => setTimesCooked(s.timesCooked));
  }, [user?.id, recipe.id]);

  // Modal de conclusão
  const [showCompletion, setShowCompletion] = useState(false);
  const [saveToHistory, setSaveToHistory] = useState(true);
  const [deductFromPantry, setDeductFromPantry] = useState(true);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Animação de celebração (scale + fade do ícone)
  const celebScale = useRef(new Animated.Value(0)).current;
  const celebOpacity = useRef(new Animated.Value(0)).current;

  const runCelebration = useCallback(() => {
    celebScale.setValue(0);
    celebOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(celebScale, { toValue: 1, bounciness: 18, useNativeDriver: true }),
      Animated.timing(celebOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [celebScale, celebOpacity]);

  // ── Timer global (store) ────────────────────────────────────────────────────
  const { addTimer, startTimer, pauseTimer, resumeTimer, removeTimer, timers } = useTimersStore();
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
  const prevDoneRef = useRef(false);

  const activeTimer = timers.find(t => t.id === activeTimerId) ?? null;
  const seconds = activeTimer?.remainingSeconds ?? timerMinutes * 60;
  const isRunning = activeTimer?.isRunning ?? false;
  const isDone = activeTimer?.isDone ?? false;

  // Detecta conclusão do timer → flash visual (haptics já disparados pelo motor global em App.tsx)
  const handleTimerComplete = useCallback(() => {
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 2000);
  }, []);

  useEffect(() => {
    if (isDone && !prevDoneRef.current) handleTimerComplete();
    prevDoneRef.current = isDone;
  }, [isDone, handleTimerComplete]);

  // Reseta o timer ativo ao trocar de passo (o timer anterior continua no store)
  useEffect(() => {
    setActiveTimerId(null);
  }, [currentStepIndex]);

  const start = () => {
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

  const pause = () => {
    if (activeTimerId) pauseTimer(activeTimerId);
  };

  const reset = () => {
    if (activeTimerId) {
      removeTimer(activeTimerId);
      setActiveTimerId(null);
    }
  };

  const handleClose = () => {
    Alert.alert('Sair', 'Tem certeza que quer sair do modo de preparo?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => navigation.goBack() },
    ]);
  };

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      openCompletionModal();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const openCompletionModal = () => {
    setSaveToHistory(true);
    setDeductFromPantry(true);
    setNote('');
    setShowCompletion(true);
    runCelebration();
  };

  const handleSaveAndExit = async () => {
    setSaving(true);
    try {
      const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
      await Promise.all([
        saveToHistory && user
          ? addToHistory(user.id, recipe.id, note.trim() || undefined)
          : Promise.resolve(),
        deductFromPantry && user && ingredients.length > 0
          ? deductRecipeIngredients(user.id, ingredients)
          : Promise.resolve(),
      ]);
    } finally {
      setSaving(false);
      setShowCompletion(false);
      navigation.goBack();
    }
  };

  // Gestos (Swipe)
  const onGestureEvent = (event: any) => {
    const { translationX, state } = event.nativeEvent;
    if (state === State.END) {
      if (translationX < -50) handleNext();
      else if (translationX > 50) handlePrev();
    }
  };

  if (!steps.length) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.instruction}>Esta receita não possui passos cadastrados.</Text>
        <TouchableOpacity style={styles.closeHeaderBtn} onPress={() => navigation.goBack()}>
          <Feather name="x" size={24} color="#fff" />
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const progress = ((currentStepIndex + 1) / steps.length) * 100;
  const isCloseToZero = seconds > 0 && seconds <= 10;
  const showTimer = timerMinutes > 0;
  const cookingLabel =
    timesCooked === 0
      ? null
      : `${ordinalFem(timesCooked + 1)} vez preparando!`;

  return (
    <SafeAreaView style={[styles.container, isFlashing && styles.containerFlash]}>
      <StatusBar hidden />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.recipeTitle} numberOfLines={1}>{recipe.title}</Text>
            {cookingLabel ? (
              <Text style={styles.cookingLabel}>{cookingLabel}</Text>
            ) : null}
          </View>
          <TouchableOpacity onPress={handleClose} style={styles.closeHeaderBtn}>
            <Feather name="x" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>Passo {currentStepIndex + 1} de {steps.length}</Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>
        </View>
      </View>

      {/* ÁREA CENTRAL */}
      <PanGestureHandler onHandlerStateChange={onGestureEvent}>
        <View style={styles.centerArea}>
          <ScrollView contentContainerStyle={styles.centerScroll}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>{currentStepIndex + 1}</Text>
            </View>

            <Text style={styles.instruction}>{currentStep?.instruction}</Text>

            {showTimer && (
              <View style={styles.timerZone}>
                <View style={[
                  styles.timerCircle,
                  isCloseToZero && styles.timerCircleDanger,
                  isDone && styles.timerCircleDone,
                ]}>
                  <Text style={[styles.timerText, isCloseToZero && styles.timerTextDanger]}>
                    {formatTime(seconds)}
                  </Text>
                </View>

                <View style={styles.timerControls}>
                  {!isRunning ? (
                    <TouchableOpacity style={styles.timerBtnPrimary} onPress={start}>
                      <Feather name="play" size={24} color="#fff" />
                      <Text style={styles.timerBtnText}>Iniciar</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.timerBtnSecondary} onPress={pause}>
                      <Feather name="pause" size={24} color="#fff" />
                      <Text style={styles.timerBtnText}>Pausar</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.timerBtnGhost} onPress={reset}>
                    <Feather name="refresh-ccw" size={20} color="#ccc" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </PanGestureHandler>

      {/* FOOTER */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.footerBtn, currentStepIndex === 0 && styles.footerBtnDisabled]}
          onPress={handlePrev}
          disabled={currentStepIndex === 0}
        >
          <Feather name="arrow-left" size={20} color={currentStepIndex === 0 ? '#555' : '#fff'} />
          <Text style={[styles.footerBtnText, currentStepIndex === 0 && { color: '#555' }]}> Anterior</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.footerBtnNext, currentStepIndex === steps.length - 1 && styles.footerBtnFinish]}
          onPress={handleNext}
        >
          <Text style={styles.footerBtnTextNext}>
            {currentStepIndex === steps.length - 1 ? 'Concluir' : 'Próximo '}
          </Text>
          {currentStepIndex !== steps.length - 1 && (
            <Feather name="arrow-right" size={20} color="#121212" />
          )}
        </TouchableOpacity>
      </View>

      {/* MODAL DE CONCLUSÃO */}
      <Modal
        visible={showCompletion}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCompletion(false)}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.completionSheet}>
            {/* Ícone animado */}
            <Animated.Text
              style={[
                styles.celebEmoji,
                { transform: [{ scale: celebScale }], opacity: celebOpacity },
              ]}
            >
              🎉
            </Animated.Text>

            <Text style={styles.completionTitle}>Receita concluída!</Text>
            <Text style={styles.completionSubtitle}>{recipe.title}</Text>

            {/* Toggle de histórico */}
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Registrar no histórico</Text>
              <Switch
                value={saveToHistory}
                onValueChange={setSaveToHistory}
                trackColor={{ false: '#555', true: colors.primary }}
                thumbColor="#fff"
              />
            </View>

            {/* Toggle de despensa */}
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Descontar da despensa</Text>
              <Switch
                value={deductFromPantry}
                onValueChange={setDeductFromPantry}
                trackColor={{ false: '#555', true: colors.primary }}
                thumbColor="#fff"
              />
            </View>

            {/* Nota pessoal */}
            {saveToHistory && (
              <View style={styles.noteWrapper}>
                <TextInput
                  style={styles.noteInput}
                  placeholder="Adicionar nota pessoal..."
                  placeholderTextColor="#666"
                  value={note}
                  onChangeText={t => setNote(t.slice(0, MAX_NOTE))}
                  multiline
                  maxLength={MAX_NOTE}
                  textAlignVertical="top"
                />
                <Text style={styles.noteCount}>{MAX_NOTE - note.length} restantes</Text>
              </View>
            )}

            {/* Botão salvar e sair */}
            <TouchableOpacity
              style={[styles.saveExitBtn, saving && { opacity: 0.6 }]}
              onPress={handleSaveAndExit}
              disabled={saving}
            >
              <Text style={styles.saveExitText}>
                {saving ? 'Salvando...' : 'Salvar e sair'}
              </Text>
            </TouchableOpacity>

            {/* Link para sair sem salvar */}
            {!saving && (
              <TouchableOpacity onPress={() => { setShowCompletion(false); navigation.goBack(); }}>
                <Text style={styles.skipText}>Sair sem registrar</Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  containerFlash: {
    backgroundColor: colors.error,
  },
  header: {
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  recipeTitle: {
    color: '#aaa',
    fontSize: 16,
    fontWeight: '600',
  },
  cookingLabel: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  closeHeaderBtn: {
    padding: 5,
  },
  progressContainer: {
    width: '100%',
  },
  progressText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
  },
  centerArea: {
    flex: 1,
  },
  centerScroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  stepBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,107,107,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  stepBadgeText: {
    color: theme.colors.primary,
    fontSize: 28,
    fontWeight: 'bold',
  },
  instruction: {
    color: '#fff',
    fontSize: 24,
    lineHeight: 34,
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 40,
  },
  timerZone: {
    alignItems: 'center',
    marginTop: 20,
  },
  timerCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 8,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  timerCircleDanger: {
    borderColor: theme.colors.error,
  },
  timerCircleDone: {
    borderColor: theme.colors.success,
  },
  timerText: {
    color: '#fff',
    fontSize: 48,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  timerTextDanger: {
    color: theme.colors.error,
  },
  timerControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    marginRight: 15,
  },
  timerBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    marginRight: 15,
  },
  timerBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  timerBtnGhost: {
    padding: 15,
    backgroundColor: '#222',
    borderRadius: 30,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2C',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  footerBtnDisabled: {
    opacity: 0.5,
  },
  footerBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  footerBtnNext: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 15,
    borderRadius: 30,
  },
  footerBtnFinish: {
    backgroundColor: theme.colors.primary,
  },
  footerBtnTextNext: {
    color: '#121212',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Completion Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  completionSheet: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    alignItems: 'center',
    gap: 16,
  },
  celebEmoji: {
    fontSize: 72,
    lineHeight: 84,
  },
  completionTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  completionSubtitle: {
    fontSize: 15,
    color: '#aaa',
    textAlign: 'center',
    marginTop: -8,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 4,
  },
  toggleLabel: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  noteWrapper: {
    width: '100%',
    backgroundColor: '#2C2C2C',
    borderRadius: 12,
    padding: 12,
  },
  noteInput: {
    fontSize: 15,
    color: '#fff',
    minHeight: 70,
    maxHeight: 120,
  },
  noteCount: {
    alignSelf: 'flex-end',
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  saveExitBtn: {
    width: '100%',
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  saveExitText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  skipText: {
    fontSize: 14,
    color: '#666',
    marginTop: -4,
  },
});
