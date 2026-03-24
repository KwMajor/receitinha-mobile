import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Vibration, Dimensions, SafeAreaView, ScrollView, StatusBar, Platform } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { theme } from '../../constants/theme';
import { useTimer } from '../../hooks/useTimer';
import { addToHistory } from '../../services/sqlite/cookingHistoryService';
import { useAuthStore } from '../../store/authStore';
import { Recipe, Step } from '../../types';

const { width } = Dimensions.get('window');

const formatTime = (totalSeconds: number) => {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export const CookingScreen = () => {
  useKeepAwake(); // Mantém a tela acesa

  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { recipe } = route.params as { recipe: Recipe };
  const { user } = useAuthStore();
  
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const steps = recipe.steps || [];
  const currentStep = steps[currentStepIndex];
  const timerMinutes = currentStep?.timer_minutes || 0;
  
  // Flash de fundo
  const [isFlashing, setIsFlashing] = useState(false);

  // Controle de Timer
  const handleTimerComplete = useCallback(() => {
    Vibration.vibrate([0, 500, 200, 500]);
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 2000);
  }, []);

  const { seconds, isRunning, isDone, start, pause, reset, setDuration } = useTimer({
    initialSeconds: timerMinutes * 60,
    stepTitle: currentStep?.instruction || 'Passo atual',
    onComplete: handleTimerComplete
  });

  // Reseta timer sempre que trocar de passo
  useEffect(() => {
    setDuration((currentStep?.timer_minutes || 0) * 60);
  }, [currentStepIndex, setDuration, currentStep?.timer_minutes]);

  // Navbar actions
  const handleClose = () => {
    Alert.alert('Sair', 'Tem certeza que quer sair do modo de preparo?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => navigation.goBack() }
    ]);
  };

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleFinish = () => {
    Alert.alert(
      'Parabéns! 🎉', 
      'Você concluiu esta receita. Deseja registrar no seu histórico?',
      [
        { text: 'Não', style: 'cancel', onPress: () => navigation.goBack() },
        { 
          text: 'Sim', 
          onPress: async () => {
            if (user) {
              await addToHistory(user.id, recipe.id);
            }
            navigation.goBack();
          } 
        }
      ]
    );
  };

  // Gestos (Swipe)
  const onGestureEvent = (event: any) => {
    const { translationX, state } = event.nativeEvent;
    if (state === State.END) {
      if (translationX < -50) {
        // Swipe left -> Next
        handleNext();
      } else if (translationX > 50) {
        // Swipe right -> Prev
        handlePrev();
      }
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

  return (
    <SafeAreaView style={[styles.container, isFlashing && styles.containerFlash]}>
      <StatusBar hidden />
      
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Text style={styles.recipeTitle} numberOfLines={1}>{recipe.title}</Text>
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
             
             {/* TIMER ZONE */}
             {showTimer && (
               <View style={styles.timerZone}>
                 <View style={[
                   styles.timerCircle, 
                   isCloseToZero && styles.timerCircleDanger,
                   isDone && styles.timerCircleDone
                 ]}>
                   <Text style={[
                     styles.timerText, 
                     isCloseToZero && styles.timerTextDanger
                   ]}>
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
          {currentStepIndex !== steps.length - 1 && <Feather name="arrow-right" size={20} color="#121212" />}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212', // Dark mode fixo
  },
  containerFlash: {
    backgroundColor: theme.colors.error,
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
    flex: 1,
    marginRight: 10,
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
  }
});
