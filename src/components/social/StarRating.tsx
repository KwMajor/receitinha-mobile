import React, { useRef } from 'react';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';

interface StarRatingProps {
  value: number;           // 0–5
  onChange?: (stars: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP = { sm: 14, md: 22, lg: 34 };
const GAP_MAP  = { sm: 3,  md: 5,  lg: 8  };

// Ícone de estrela em SVG nativo para evitar dependência extra
function StarIcon({ filled, size }: { filled: boolean; size: number }) {
  // Usamos Text unicode — compatível com todas as plataformas
  return (
    <Animated.Text
      style={{
        fontSize: size,
        color: filled ? '#FFA500' : '#D1D5DB',
        lineHeight: size + 4,
      }}
    >
      ★
    </Animated.Text>
  );
}

export const StarRating = ({
  value,
  onChange,
  readonly = false,
  size = 'md',
}: StarRatingProps) => {
  const starSize = SIZE_MAP[size];
  const gap      = GAP_MAP[size];

  // Um Animated.Value por estrela para a animação de scale
  const scales = useRef(
    [1, 2, 3, 4, 5].map(() => new Animated.Value(1)),
  ).current;

  const handlePress = (star: number) => {
    if (readonly || !onChange) return;

    // Animação de bounce na estrela pressionada
    Animated.sequence([
      Animated.timing(scales[star - 1], {
        toValue: 1.45,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scales[star - 1], {
        toValue: 1,
        useNativeDriver: true,
        bounciness: 10,
      }),
    ]).start();

    onChange(star);
  };

  return (
    <View style={[styles.row, { gap }]}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= Math.round(value);
        return (
          <TouchableOpacity
            key={star}
            onPress={() => handlePress(star)}
            disabled={readonly}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <Animated.View style={{ transform: [{ scale: scales[star - 1] }] }}>
              <StarIcon filled={filled} size={starSize} />
            </Animated.View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
