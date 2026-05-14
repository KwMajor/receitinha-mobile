import React from 'react';
import { Platform, StyleProp, ViewStyle } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  extraScrollHeight?: number;
  enableOnAndroid?: boolean;
}

export default function KeyboardAwareContainer({
  children,
  style,
  contentContainerStyle,
  extraScrollHeight = 24,
  enableOnAndroid = true,
}: Props) {
  return (
    <KeyboardAwareScrollView
      style={style}
      contentContainerStyle={contentContainerStyle}
      extraScrollHeight={extraScrollHeight}
      enableOnAndroid={enableOnAndroid}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      bounces={Platform.OS !== 'ios' ? undefined : false}
    >
      {children}
    </KeyboardAwareScrollView>
  );
}
