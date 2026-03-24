import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { View, Text, TouchableOpacity } from 'react-native';
import { theme } from '../constants/theme';
import { useNavigation } from '@react-navigation/native';

import { createStackNavigator } from '@react-navigation/stack';
import { RecipeListScreen } from '../screens/recipes/RecipeListScreen';
import CreateRecipeScreen from '../screens/recipes/CreateRecipeScreen';
import EditRecipeScreen from '../screens/recipes/EditRecipeScreen';
import { RecipeDetailScreen } from '../screens/recipes/RecipeDetailScreen';
import { CookingScreen } from '../screens/recipes/CookingScreen';
import { FavoritesScreen } from '../screens/recipes/FavoritesScreen';
import { CollectionDetailScreen } from '../screens/recipes/CollectionDetailScreen';
import { CategoriesScreen } from '../screens/settings/CategoriesScreen';
import { ProfileScreen } from '../screens/settings/ProfileScreen';
import { CookingHistoryScreen } from '../screens/settings/CookingHistoryScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const RecipeStackGroup = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="RecipeList" component={RecipeListScreen} />
    <Stack.Screen name="CreateRecipe" component={CreateRecipeScreen} options={{ headerShown: true, title: 'Nova Receita' }} />
    <Stack.Screen name="EditRecipe" component={EditRecipeScreen} options={{ headerShown: true, title: 'Editar Receita' }} />
    <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} />
    <Stack.Screen name="CookingMode" component={CookingScreen} options={{ presentation: 'modal' }} />
  </Stack.Navigator>
);

const FavoritesStackGroup = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="FavoritesList" component={FavoritesScreen} options={{ headerShown: true, title: 'Favoritos e Coleções' }} />
    <Stack.Screen name="CollectionDetail" component={CollectionDetailScreen} options={{ headerShown: true }} />
    <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} />
    <Stack.Screen name="CookingMode" component={CookingScreen} options={{ presentation: 'modal' }} />
  </Stack.Navigator>
);

const ProfileStackGroup = () => (
  <Stack.Navigator>
    <Stack.Screen name="ProfileMain" component={ProfileScreen} options={{ title: 'Perfil' }} />
    <Stack.Screen name="Categories" component={CategoriesScreen} options={{ title: 'Minhas Categorias' }} />
    <Stack.Screen name="CookingHistory" component={CookingHistoryScreen} options={{ title: 'Histórico de Preparo' }} />
  </Stack.Navigator>
);

export const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          borderTopColor: theme.colors.border,
          backgroundColor: theme.colors.background,
        }
      }}
    >
      <Tab.Screen 
        name="RecipeStack" 
        component={RecipeStackGroup} 
        options={{
          tabBarLabel: 'Receitas',
          tabBarIcon: ({ color, size }) => <Feather name="book" size={size} color={color} />
        }}
      />
      <Tab.Screen 
        name="FavoritesStack" 
        component={FavoritesStackGroup} 
        options={{
          tabBarLabel: 'Salvos',
          tabBarIcon: ({ color, size }) => <Feather name="heart" size={size} color={color} />
        }}
      />
      <Tab.Screen 
        name="ProfileStack" 
        component={ProfileStackGroup} 
        options={{
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} />
        }}
      />
    </Tab.Navigator>
  );
};
