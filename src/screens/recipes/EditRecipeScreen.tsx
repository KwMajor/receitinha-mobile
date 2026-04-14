import React, { useEffect, useState } from 'react';
import { Alert, ActivityIndicator, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import RecipeForm from '../../components/recipe/RecipeForm';
import { updateRecipe, getRecipeById, CreateRecipeInput } from '../../services/sqlite/recipeService';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../contexts/ThemeContext';

export default function EditRecipeScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const user = useAuthStore(state => state.user);
  const { colors } = useTheme();
  
  const [initialData, setInitialData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const recipeId = route.params.id;

  useEffect(() => {
    loadRecipe();
  }, [recipeId]);

  const loadRecipe = async () => {
    try {
      const recipe = await getRecipeById(recipeId);
      if (recipe) {
        setInitialData({
          title: recipe.title,
          description: recipe.description || '',
          servings: recipe.servings.toString(),
          category: recipe.category,
          photoUrl: recipe.photoUrl || '',
          ingredients: recipe.ingredients.map((i: any) => ({
            name: i.name,
            quantity: i.quantity.toString().replace('.', ','),
            unit: i.unit
          })),
          steps: recipe.steps.map((s: any) => ({
            instruction: s.instruction,
            timerMinutes: s.timer_minutes ? s.timer_minutes.toString() : '',
          }))
        });
      }
    } catch (error) {
       Alert.alert('Erro ao carregar', 'Não foi possível carregar os dados da receita. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: any) => {
    if (!user) return;
    try {
      const input: CreateRecipeInput = {
        title: data.title,
        description: data.description || '',
        prepTime: data.prepTime,
        servings: parseInt(data.servings, 10),
        category: data.category,
        photoUrl: data.photoUrl,
        isPublic: false,
        ingredients: data.ingredients.map((i: any) => ({
          name: i.name,
          quantity: parseFloat(i.quantity.replace(',','.')),
          unit: i.unit
        })),
        steps: data.steps.map((s: any) => ({
          instruction: s.instruction,
          timerMinutes: parseInt(s.timerMinutes, 10),
        }))
      };

      await updateRecipe(recipeId, input);
      Alert.alert('Receita atualizada!', `"${input.title}" foi salva com as alterações.`);
      navigation.goBack();
    } catch {
      Alert.alert('Erro ao salvar', 'Não foi possível salvar as alterações. Tente novamente.');
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!initialData) return null;

  return (
    <RecipeForm
      titleHeader="Editar Receita"
      initialData={initialData}
      onSubmitData={handleSubmit}
    />
  );
}
