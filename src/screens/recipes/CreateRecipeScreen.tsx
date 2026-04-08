import React from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import RecipeForm from '../../components/recipe/RecipeForm';
import { createRecipe, CreateRecipeInput } from '../../services/sqlite/recipeService';
import { useAuthStore } from '../../store/authStore';

export default function CreateRecipeScreen() {
  const navigation = useNavigation<any>();
  const user = useAuthStore(state => state.user);

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

      await createRecipe(user.id, input);
      Alert.alert('Receita criada!', `"${input.title}" foi salva com sucesso.`);
      navigation.goBack();
    } catch {
      Alert.alert('Erro ao salvar', 'Não foi possível salvar a receita. Verifique sua conexão e tente novamente.');
    }
  };

  return (
    <RecipeForm
      titleHeader="Nova Receita"
      onSubmitData={handleSubmit}
    />
  );
}
