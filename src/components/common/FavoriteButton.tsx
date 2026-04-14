import React, { useState, useCallback, useRef } from 'react';
import { TouchableOpacity, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { toggleFavorite, isFavorite } from '../../services/sqlite/favoriteService';
import { useAuthStore } from '../../store/authStore';

interface FavoriteButtonProps {
  recipeId: string;
  size?: number;
}

export const FavoriteButton = ({ recipeId, size = 24 }: FavoriteButtonProps) => {
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const [isFav, setIsFav] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;

  useFocusEffect(
    useCallback(() => {
      checkFavorite();
    }, [recipeId])
  );

  const checkFavorite = async () => {
    if (!user) return;
    const fav = await isFavorite(user.id, recipeId);
    setIsFav(fav);
  };

  const handleToggle = async () => {
    if (!user) return;

    const prevFav = isFav;
    setIsFav(!prevFav);

    Animated.sequence([
      Animated.timing(scale, { toValue: 1.3, duration: 100, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true })
    ]).start();

    try {
      const result = await toggleFavorite(user.id, recipeId);
      setIsFav(result);
    } catch (e) {
      setIsFav(prevFav);
    }
  };

  return (
    <TouchableOpacity onPress={handleToggle} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Feather
          name="heart"
          size={size}
          color={isFav ? colors.error : colors.textSecondary}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};
