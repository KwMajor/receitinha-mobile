import React, { useState, useLayoutEffect, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Modal, FlatList } from 'react-native';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { uploadAsync, FileSystemUploadType } from 'expo-file-system/legacy';

import { theme } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import { getCategories } from '../../services/sqlite/categoryService';
import { createRecipe, CreateRecipeInput } from '../../services/sqlite/recipeService';

import { PhotoPicker } from '../../components/forms/PhotoPicker';
import { IngredientItem } from '../../components/forms/IngredientItem';
import { StepItem } from '../../components/forms/StepItem';

const recipeSchema = z.object({
  title: z.string().min(1, 'O título é obrigatório'),
  description: z.string().optional(),
  category: z.string().min(1, 'Selecione uma categoria'),
  prepTime: z.string().min(1, 'O tempo é obrigatório'),
  servings: z.string().min(1, 'Obrigatório'),
  photoUrl: z.string().optional(),
  ingredients: z.array(z.object({
    quantity: z.string().min(1),
    unit: z.string(),
    name: z.string().min(1)
  })).min(1, 'Adicione pelo menos 1 ingrediente'),
  steps: z.array(z.object({
    instruction: z.string().min(1),
    timerMinutes: z.string().optional()
  })).min(1, 'Adicione pelo menos 1 passo')
});

export type RecipeFormData = z.infer<typeof recipeSchema>;

export interface RecipeFormProps {
  initialData?: any;
  onSubmitData: (data: any) => Promise<void>;
  titleHeader?: string;
}

const RecipeForm = ({ initialData, onSubmitData, titleHeader = 'Nova Receita' }: RecipeFormProps) => {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [modalCategoryVisible, setModalCategoryVisible] = useState(false);
  const [categoryNames, setCategoryNames] = useState<string[]>([]);

  useEffect(() => {
    if (user?.id) {
      getCategories(user.id).then(cats => setCategoryNames(cats.map(c => c.name)));
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

  useLayoutEffect(() => {
    navigation.setOptions({
      title: titleHeader,
      headerRight: () => (
        <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit(onSubmit)} disabled={loading}>
          {loading ? <ActivityIndicator color={theme.colors.primary} size="small" /> : <Feather name="check" size={24} color={theme.colors.primary} />}
        </TouchableOpacity>
      )
    });
  }, [navigation, loading, titleHeader]);

  const uploadPhoto = async (uri: string, recipeId: string): Promise<string> => {
    const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

    const result = await uploadAsync(uploadUrl, uri, {
      httpMethod: 'POST',
      uploadType: FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      mimeType: 'image/jpeg',
      parameters: {
        upload_preset: uploadPreset!,
        public_id: `recipes/${user?.id}/${recipeId}`,
      },
    });

    if (result.status < 200 || result.status >= 300) {
      console.error('Falha no upload da foto', { uri, recipeId, body: result.body });
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
      const temporalId = initialData?.id || Date.now().toString() + Math.random().toString(36).substring(2, 9); // mock ID temporário para pasta do Firebase

      if (data.photoUrl && !data.photoUrl.startsWith('http')) {
        finalPhotoUrl = await uploadPhoto(data.photoUrl, temporalId);
      }

      await onSubmitData({
         ...data,
         photoUrl: finalPhotoUrl
      });

    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      Alert.alert('Erro', `Ocorreu um erro ao salvar a receita: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* SEÇÃO 1 — Foto */}
      <View style={styles.section}>
        <Controller
          control={control}
          name="photoUrl"
          render={({ field: { onChange, value } }) => (
            <PhotoPicker imageUri={value || null} onChange={onChange} />
          )}
        />
      </View>

      {/* SEÇÃO 2 — Informações básicas */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informações Básicas</Text>
        
        <Controller control={control} name="title" render={({ field: { onChange, value } }) => (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Título da Receita *</Text>
            <TextInput style={styles.input} value={value} onChangeText={onChange} placeholder="Ex: Bolo de Cenoura" returnKeyType="done" />
            {errors.title && <Text style={styles.error}>{errors.title.message}</Text>}
          </View>
        )} />

        <Controller control={control} name="description" render={({ field: { onChange, value } }) => (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Descrição</Text>
            <TextInput style={[styles.input, styles.textArea]} value={value} onChangeText={onChange} placeholder="Uma breve descrição..." multiline />
          </View>
        )} />

        <View style={styles.row}>
          <Controller control={control} name="prepTime" render={({ field: { onChange, value } }) => (
            <View style={[styles.inputGroup, { flex: 1, marginRight: theme.spacing.sm }]}>
              <Text style={styles.label}>Tempo (min) *</Text>
              <TextInput style={styles.input} value={value} onChangeText={onChange} keyboardType="numeric" placeholder="45" returnKeyType="done" />
              {errors.prepTime && <Text style={styles.error}>{errors.prepTime.message}</Text>}
            </View>
          )} />

          <Controller control={control} name="servings" render={({ field: { onChange, value } }) => (
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Porções *</Text>
              <TextInput style={styles.input} value={value} onChangeText={onChange} keyboardType="numeric" placeholder="8" returnKeyType="done" />
              {errors.servings && <Text style={styles.error}>{errors.servings.message}</Text>}
            </View>
          )} />
        </View>

        <Controller control={control} name="category" render={({ field: { onChange, value } }) => (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Categoria *</Text>
            <TouchableOpacity style={styles.pickerButton} onPress={() => setModalCategoryVisible(true)}>
              <Text style={styles.pickerButtonText}>{value || 'Selecione'}</Text>
              <Feather name="chevron-down" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            {errors.category && <Text style={styles.error}>{errors.category.message}</Text>}
            
            <Modal visible={modalCategoryVisible} transparent animationType="slide">
              <View style={styles.modalContainer}>
                 <View style={styles.modalContent}>
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
                 </View>
              </View>
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
          <Feather name="plus" size={20} color={theme.colors.primary} />
          <Text style={styles.addButtonText}>Adicionar Ingrediente</Text>
        </TouchableOpacity>
      </View>

      {/* SEÇÃO 4 — Modo de preparo */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Modo de Preparo *</Text>
        {errors.steps && <Text style={styles.error}>{errors.steps.message}</Text>}
        
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
                 />
               )} />
             )} />
          </View>
        ))}
        <TouchableOpacity style={styles.addButton} onPress={() => appendStep({ instruction: '', timerMinutes: '' })}>
          <Feather name="plus" size={20} color={theme.colors.primary} />
          <Text style={styles.addButtonText}>Adicionar Passo</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: theme.spacing.md, backgroundColor: theme.colors.background },
  saveBtn: { marginRight: theme.spacing.md },
  section: { marginBottom: theme.spacing.xl },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text, marginBottom: theme.spacing.md },
  inputGroup: { marginBottom: theme.spacing.md },
  label: { fontSize: 14, color: theme.colors.text, marginBottom: theme.spacing.xs },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, backgroundColor: '#fff' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  error: { color: theme.colors.error, fontSize: 12, marginTop: 4 },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: theme.spacing.md, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.colors.primary, borderRadius: theme.borderRadius.md, marginTop: theme.spacing.sm },
  addButtonText: { color: theme.colors.primary, fontWeight: 'bold', marginLeft: theme.spacing.sm },
  pickerButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, backgroundColor: '#fff' },
  pickerButtonText: { color: theme.colors.text },
  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: theme.borderRadius.lg, borderTopRightRadius: theme.borderRadius.lg, maxHeight: '50%' },
  modalTitle: { padding: theme.spacing.md, fontSize: 18, fontWeight: 'bold', textAlign: 'center', borderBottomWidth: 1, borderColor: theme.colors.border },
  modalItem: { padding: theme.spacing.md, borderBottomWidth: 1, borderColor: theme.colors.surface },
  modalItemText: { fontSize: 16, textAlign: 'center' }
});
export default RecipeForm;
