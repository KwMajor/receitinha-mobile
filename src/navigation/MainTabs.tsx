import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

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
import { ConverterScreen } from '../screens/settings/ConverterScreen';
import { BackupScreen } from '../screens/settings/BackupScreen';
import { AppearanceScreen } from '../screens/settings/AppearanceScreen';
import { SubstitutionsScreen } from '../screens/settings/SubstitutionsScreen';
import { WeekPlanScreen } from '../screens/planning/WeekPlanScreen';
import { SuggestionsScreen } from '../screens/suggestions/SuggestionsScreen';
import { ShoppingListsScreen } from '../screens/shopping/ShoppingListsScreen';
import { ShoppingListDetailScreen } from '../screens/shopping/ShoppingListDetailScreen';
import { BarcodeScannerScreen } from '../screens/shopping/BarcodeScannerScreen';
import { BudgetReportScreen } from '../screens/shopping/BudgetReportScreen';
import { SpendingHistoryScreen } from '../screens/shopping/SpendingHistoryScreen';
import { CommunityFeedScreen } from '../screens/social/CommunityFeedScreen';
import { PublicRecipeScreen } from '../screens/social/PublicRecipeScreen';
import { FloatingTimerWidget } from '../components/timers/FloatingTimerWidget';
import { TimerDrawer } from '../components/timers/TimerDrawer';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// ── Stacks ────────────────────────────────────────────────────────────────────

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
    <Stack.Screen name="FavoritesList" component={FavoritesScreen} />
    <Stack.Screen name="CollectionDetail" component={CollectionDetailScreen} options={{ headerShown: true }} />
    <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} />
    <Stack.Screen name="EditRecipe" component={EditRecipeScreen} options={{ headerShown: true, title: 'Editar Receita' }} />
    <Stack.Screen name="CookingMode" component={CookingScreen} options={{ presentation: 'modal' }} />
  </Stack.Navigator>
);

const PlanningStackGroup = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="WeekPlan" component={WeekPlanScreen} />
    <Stack.Screen name="Suggestions" component={SuggestionsScreen} />
    <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} />
    <Stack.Screen name="CookingMode" component={CookingScreen} options={{ presentation: 'modal' }} />
  </Stack.Navigator>
);

const ShoppingStackGroup = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ShoppingLists" component={ShoppingListsScreen} />
    <Stack.Screen name="ShoppingListDetail" component={ShoppingListDetailScreen} />
    <Stack.Screen name="BudgetReport" component={BudgetReportScreen} />
    <Stack.Screen name="BarcodeScanner" component={BarcodeScannerScreen} options={{ presentation: 'modal' }} />
    <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} />
    <Stack.Screen name="EditRecipe" component={EditRecipeScreen} options={{ headerShown: true, title: 'Editar Receita' }} />
    <Stack.Screen name="CookingMode" component={CookingScreen} options={{ presentation: 'modal' }} />
  </Stack.Navigator>
);

const SocialStackGroup = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="CommunityFeed" component={CommunityFeedScreen} />
    <Stack.Screen name="PublicRecipe" component={PublicRecipeScreen} />
    <Stack.Screen name="CookingMode" component={CookingScreen} options={{ presentation: 'modal' }} />
  </Stack.Navigator>
);

const ProfileStackGroup = () => (
  <Stack.Navigator screenOptions={{ headerShown: true }}>
    <Stack.Screen name="ProfileMain" component={ProfileScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Categories" component={CategoriesScreen} options={{ title: 'Minhas Categorias' }} />
    <Stack.Screen name="CookingHistory" component={CookingHistoryScreen} options={{ title: 'Histórico de Preparo' }} />
    <Stack.Screen name="Converter" component={ConverterScreen} options={{ title: 'Conversor de Medidas' }} />
    <Stack.Screen name="Backup" component={BackupScreen} options={{ title: 'Backup na nuvem' }} />
    <Stack.Screen name="Appearance" component={AppearanceScreen} options={{ title: 'Aparência' }} />
    <Stack.Screen name="Substitutions" component={SubstitutionsScreen} options={{ title: 'Guia de Substituições' }} />
    <Stack.Screen name="SpendingHistory" component={SpendingHistoryScreen} options={{ headerShown: false }} />
    <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} options={{ headerShown: false }} />
    <Stack.Screen name="EditRecipe" component={EditRecipeScreen} options={{ headerShown: true, title: 'Editar Receita' }} />
    <Stack.Screen name="CookingMode" component={CookingScreen} options={{ presentation: 'modal' }} />
  </Stack.Navigator>
);

// ── Tab Navigator ──────────────────────────────────────────────────────────────

export const MainTabs = () => {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1 }}>
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          borderTopColor: colors.border,
          backgroundColor: colors.background,
        },
      }}
    >
      <Tab.Screen
        name="RecipeStack"
        component={RecipeStackGroup}
        options={{
          tabBarLabel: 'Receitas',
          tabBarIcon: ({ color, size }) => <Feather name="book" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="FavoritesStack"
        component={FavoritesStackGroup}
        options={{
          tabBarLabel: 'Salvos',
          tabBarIcon: ({ color, size }) => <Feather name="heart" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="PlanningStack"
        component={PlanningStackGroup}
        options={{
          tabBarLabel: 'Planejar',
          tabBarIcon: ({ color, size }) => <Feather name="calendar" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="ShoppingStack"
        component={ShoppingStackGroup}
        options={{
          tabBarLabel: 'Compras',
          tabBarIcon: ({ color, size }) => <Feather name="shopping-cart" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="SocialStack"
        component={SocialStackGroup}
        options={{
          tabBarLabel: 'Comunidade',
          tabBarIcon: ({ color, size }) => <Feather name="globe" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="ProfileStack"
        component={ProfileStackGroup}
        options={{
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
    <FloatingTimerWidget />
    <TimerDrawer />
    </View>
  );
};
