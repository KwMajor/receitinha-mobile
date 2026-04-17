import React, { useState, useLayoutEffect, useEffect, useRef } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Modal, FlatList, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { uploadAsync, FileSystemUploadType } from 'expo-file-system/legacy';

import { theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api/client';
import { getCategories } from '../../services/sqlite/categoryService';

import { PhotoPicker } from '../../components/forms/PhotoPicker';
import { VideoPicker } from '../../components/forms/VideoPicker';
import { IngredientItem } from '../../components/forms/IngredientItem';
import { StepItem } from '../../components/forms/StepItem';

const recipeSchema = z.object({
  title: z.string().min(1, 'O título é obrigatório'),
  description: z.string().optional(),
  category: z.string().min(1, 'Selecione uma categoria'),
  servings: z.string()
    .min(1, 'Obrigatório')
    .refine(v => /^\d+$/.test(v) && Number(v) > 0, 'Informe um número inteiro positivo'),
  photoUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  ingredients: z.array(z.object({
    quantity: z.string()
      .min(1, 'Obrigatório')
      .refine(v => /^\d+([.,]\d+)?$/.test(v) && parseFloat(v.replace(',', '.')) > 0, 'Informe um número válido'),
    unit: z.string(),
    name: z.string().min(1)
  })).min(1, 'Adicione pelo menos 1 ingrediente'),
  steps: z.array(z.object({
    instruction: z.string().min(1, 'Descreva o passo'),
    timerMinutes: z.string()
      .min(1, 'Informe o tempo deste passo')
      .refine(v => /^\d+$/.test(v) && Number(v) > 0, 'Informe um número inteiro positivo'),
  })).min(1, 'Adicione pelo menos 1 passo')
});

export type RecipeFormData = z.infer<typeof recipeSchema>;

export interface RecipeFormProps {
  initialData?: any;
  onSubmitData: (data: any) => Promise<void>;
  titleHeader?: string;
  onImportPress?: () => void;
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { padding: theme.spacing.md, backgroundColor: colors.background },
  saveBtn: { marginRight: theme.spacing.md },
  section: { marginBottom: theme.spacing.xl },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: theme.spacing.md },
  inputGroup: { marginBottom: theme.spacing.md },
  label: { fontSize: 14, color: colors.text, marginBottom: theme.spacing.xs },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, backgroundColor: colors.surface, color: colors.text },
  textArea: { minHeight: 80, textAlignVertical: 'top' as const },
  row: { flexDirection: 'row' as const, justifyContent: 'space-between' as const },
  sectionHint: { fontSize: 13, color: colors.textSecondary, marginBottom: theme.spacing.md, marginTop: -theme.spacing.sm },
  error: { color: colors.error, fontSize: 12, marginTop: 4 },
  addButton: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, padding: theme.spacing.md, borderWidth: 1, borderStyle: 'dashed' as const, borderColor: colors.primary, borderRadius: theme.borderRadius.md, marginTop: theme.spacing.sm },
  addButtonText: { color: colors.primary, fontWeight: 'bold' as const, marginLeft: theme.spacing.sm },
  pickerButton: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, borderWidth: 1, borderColor: colors.border, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, backgroundColor: colors.surface },
  pickerButtonText: { color: colors.text },
  modalContainer: { flex: 1, justifyContent: 'flex-end' as const, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: colors.background, borderTopLeftRadius: theme.borderRadius.lg, borderTopRightRadius: theme.borderRadius.lg, maxHeight: '50%' as any },
  modalTitle: { padding: theme.spacing.md, fontSize: 18, fontWeight: 'bold' as const, textAlign: 'center' as const, borderBottomWidth: 1, borderColor: colors.border, color: colors.text },
  modalItem: { padding: theme.spacing.md, borderBottomWidth: 1, borderColor: colors.surface },
  modalItemText: { fontSize: 16, textAlign: 'center' as const, color: colors.text },
});

const RecipeForm = ({ initialData, onSubmitData, titleHeader = 'Nova Receita', onImportPress }: RecipeFormProps) => {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [loading, setLoading] = useState(false);
  const [modalCategoryVisible, setModalCategoryVisible] = useState(false);
  const [categoryNames, setCategoryNames] = useState<string[]>([]);

  useEffect(() => {
    if (user?.id) {
      getCategories(user.id).then(cats => setCategoryNames(cats.filter(c => c.isActive).map(c => c.name)));
    }
  }, [user?.id]);

  const { control, handleSubmit, formState: { errors } } = useForm<RecipeFormData>({
    resolver: zodResolver(recipeSchema),
    defaultValues: initialData || {
      category: '',
      ingredients: [{ quantity: '', unit: '', name: '' }],
      steps: [{ instruction: '', timerMinutes: '' }]
    }
  });

  const { fields: ingFields, append: appendIng, remove: removeIng } = useFieldArray({ control, name: "ingredients" });
  const { fields: stepFields, append: appendStep, remove: removeStep } = useFieldArray({ control, name: "steps" });
  const scrollRef = useRef<ScrollView>(null);
  const stepFocused = useRef(false);

  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidShow', () => {
      if (stepFocused.current) {
        scrollRef.current?.scrollToEnd({ animated: true });
      }
    });
    return () => sub.remove();
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: titleHeader,
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: theme.spacing.md }}>
          {onImportPress && (
            <TouchableOpacity onPress={onImportPress} style={{ padding: 4 }}>
              <Feather name="link" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleSubmit(onSubmit)} disabled={loading} style={{ padding: 4 }}>
            {loading ? <ActivityIndicator color={colors.primary} size="small" /> : <Feather name="check" size={24} color={colors.primary} />}
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, loading, titleHeader, onImportPress]);

  const uploadVideo = async (uri: string): Promise<string> => {
    const { signature, timestamp, apiKey, cloudName, folder } = await api.get<{
      signature: string; timestamp: number; apiKey: string; cloudName: string; folder: string;
    }>('/api/user/photos/sign?type=video');

    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`;

    const result = await uploadAsync(uploadUrl, uri, {
      httpMethod: 'POST',
      uploadType: FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      mimeType: 'video/mp4',
      parameters: {
        api_key: apiKey,
        timestamp: String(timestamp),
        signature,
        folder,
      },
    });

    if (result.status < 200 || result.status >= 300) {
      throw new Error(`Upload do vídeo falhou com status ${result.status}`);
    }

    return JSON.parse(result.body).secure_url;
  };

  const uploadPhoto = async (uri: string): Promise<string> => {
    // Busca assinatura do backend — nunca expõe o API secret no app
    const { signature, timestamp, apiKey, cloudName, folder } = await api.get<{
      signature: string; timestamp: number; apiKey: string; cloudName: string; folder: string;
    }>('/api/user/photos/sign');

    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

    const result = await uploadAsync(uploadUrl, uri, {
      httpMethod: 'POST',
      uploadType: FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      mimeType: 'image/jpeg',
      parameters: {
        api_key: apiKey,
        timestamp: String(timestamp),
        signature,
        folder,
      },
    });

    if (result.status < 200 || result.status >= 300) {
      throw new Error(`Upload falhou com status ${result.status}`);
    }

    const responseJson = JSON.parse(result.body);
    return responseJson.secure_url;
  };

  const onSubmit = async (data: RecipeFormData) => {
    if (!user) return;
    try {
      setLoading(true);

      let finalPhotoUrl = data.photoUrl;
      if (data.photoUrl && !data.photoUrl.startsWith('http')) {
        finalPhotoUrl = await uploadPhoto(data.photoUrl);
      }

      let finalVideoUrl = data.videoUrl;
      if (data.videoUrl && !data.videoUrl.startsWith('http')) {
        finalVideoUrl = await uploadVideo(data.videoUrl);
      }

      const prepTime = data.steps.reduce((acc, s) => acc + parseInt(s.timerMinutes, 10), 0);

      await onSubmitData({
        ...data,
        prepTime,
        photoUrl: finalPhotoUrl,
        videoUrl: finalVideoUrl,
      });

    } catch (error) {
      Alert.alert('Erro ao salvar', 'Não foi possível salvar a receita. Verifique sua conexão e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
    >
      {/* SEÇÃO 1 — Foto e Vídeo */}
      <View style={styles.section}>
        <Controller
          control={control}
          name="photoUrl"
          render={({ field: { onChange, value } }) => (
            <PhotoPicker imageUri={value || null} onChange={onChange} />
          )}
        />
        <Controller
          control={control}
          name="videoUrl"
          render={({ field: { onChange, value } }) => (
            <VideoPicker videoUri={value || null} onChange={uri => onChange(uri ?? '')} />
          )}
        />
      </View>

      {/* SEÇÃO 2 — Informações básicas */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informações Básicas</Text>
        
        <Controller control={control} name="title" render={({ field: { onChange, value } }) => (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Título da Receita *</Text>
            <TextInput style={styles.input} value={value} onChangeText={onChange} placeholder="Ex: Bolo de Cenoura" placeholderTextColor={colors.textSecondary} returnKeyType="done" />
            {errors.title && <Text style={styles.error}>{errors.title.message}</Text>}
          </View>
        )} />

        <Controller control={control} name="description" render={({ field: { onChange, value } }) => (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Descrição</Text>
            <TextInput style={[styles.input, styles.textArea]} value={value} onChangeText={onChange} placeholder="Uma breve descrição..." placeholderTextColor={colors.textSecondary} multiline />
          </View>
        )} />

        <Controller control={control} name="servings" render={({ field: { onChange, value } }) => (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Porções *</Text>
            <TextInput style={styles.input} value={value} onChangeText={v => onChange(v.replace(/[^0-9]/g, ''))} keyboardType="numeric" placeholder="8" placeholderTextColor={colors.textSecondary} returnKeyType="done" />
            {errors.servings && <Text style={styles.error}>{errors.servings.message}</Text>}
          </View>
        )} />

        <Controller control={control} name="category" render={({ field: { onChange, value } }) => (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Categoria *</Text>
            <TouchableOpacity style={styles.pickerButton} onPress={() => setModalCategoryVisible(true)}>
              <Text style={styles.pickerButtonText}>{value || 'Selecione'}</Text>
              <Feather name="chevron-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            {errors.category && <Text style={styles.error}>{errors.category.message}</Text>}
            
            <Modal visible={modalCategoryVisible} transparent animationType="slide" onRequestClose={() => setModalCategoryVisible(false)}>
              <TouchableOpacity style={styles.modalContainer} activeOpacity={1} onPress={() => setModalCategoryVisible(false)}>
                 <TouchableOpacity style={styles.modalContent} activeOpacity={1} onPress={() => {}}>
                    <Text style={styles.modalTitle}>Categorias</Text>
                    <FlatList
                      data={categoryNames}
                      keyExtractor={i => i}
                      renderItem={({ item }) => (
                        <TouchableOpacity style={styles.modalItem} onPress={() => { onChange(item); setModalCategoryVisible(false); }}>
                          <Text style={styles.modalItemText}>{item}</Text>
                        </TouchableOpacity>
                      )}
                    />
                 </TouchableOpacity>
              </TouchableOpacity>
            </Modal>
          </View>
        )} />
      </View>

      {/* SEÇÃO 3 — Ingredientes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ingredientes *</Text>
        {errors.ingredients && <Text style={styles.error}>{errors.ingredients.message}</Text>}
        
        {ingFields.map((field, index) => (
          <View key={field.id}>
             <Controller control={control} name={`ingredients.${index}.quantity`} render={({field: {onChange, value}}) => (
               <Controller control={control} name={`ingredients.${index}.unit`} render={({field: {onChange: onChangeU, value: valueU}}) => (
                 <Controller control={control} name={`ingredients.${index}.name`} render={({field: {onChange: onChangeN, value: valueN}}) => (
                   <IngredientItem
                     quantity={value}
                     onChangeQuantity={onChange}
                     unit={valueU}
                     onChangeUnit={onChangeU}
                     name={valueN}
                     onChangeName={onChangeN}
                     onRemove={() => removeIng(index)}
                   />
                 )} />
               )} />
             )} />
          </View>
        ))}
        <TouchableOpacity style={styles.addButton} onPress={() => appendIng({ quantity: '', unit: 'g', name: '' })}>
          <Feather name="plus" size={20} color={colors.primary} />
          <Text style={styles.addButtonText}>Adicionar Ingrediente</Text>
        </TouchableOpacity>
      </View>

      {/* SEÇÃO 4 — Modo de preparo */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Modo de Preparo *</Text>
        <Text style={styles.sectionHint}>Cada passo deve ter um tempo — o total será o tempo de preparo da receita.</Text>
        {errors.steps && typeof errors.steps.message === 'string' && (
          <Text style={styles.error}>{errors.steps.message}</Text>
        )}

        {stepFields.map((field, index) => (
          <View key={field.id}>
            <Controller control={control} name={`steps.${index}.instruction`} render={({field: {onChange, value}}) => (
              <Controller control={control} name={`steps.${index}.timerMinutes`} render={({field: {onChange: onChangeT, value: valueT}}) => (
                <StepItem
                  order={index + 1}
                  instruction={value}
                  onChangeInstruction={onChange}
                  timerMinutes={valueT}
                  onChangeTimer={onChangeT}
                  onRemove={() => removeStep(index)}
                  timerError={errors.steps?.[index]?.timerMinutes?.message}
                  onFocus={() => { stepFocused.current = true; }}
                />
              )} />
            )} />
          </View>
        ))}
        <TouchableOpacity style={styles.addButton} onPress={() => {
          appendStep({ instruction: '', timerMinutes: '' });
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
        }}>
          <Feather name="plus" size={20} color={colors.primary} />
          <Text style={styles.addButtonText}>Adicionar Passo</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default RecipeForm;
