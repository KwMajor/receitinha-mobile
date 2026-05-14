import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Alert, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigation } from '@react-navigation/native';
import { resetPassword } from '../../services/firebase/auth';
import { theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

const forgotPasswordSchema = z.object({
  email: z.string()
    .min(1, 'E-mail é obrigatório')
    .transform((v) => v.trim())
    .refine((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'E-mail inválido')
    .refine((v) => v.length <= 254, 'E-mail muito longo'),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export const ForgotPasswordScreen = () => {
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const { control, handleSubmit, formState: { errors } } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    try {
      setLoading(true);
      await resetPassword(data.email).catch((error: any) => {
        if (error.code !== 'auth/user-not-found') throw error;
      });
      Alert.alert('E-mail enviado!', 'Se houver uma conta com este endereço, você receberá as instruções em breve. Verifique sua caixa de entrada e pasta de spam.');
      navigation.goBack();
    } catch (error: any) {
      const errorMessage = error.code === 'auth/network-request-failed'
        ? 'Sem conexão com a internet. Verifique sua rede e tente novamente.'
        : 'Não foi possível enviar o e-mail de recuperação. Tente novamente.';
      Alert.alert('Erro ao enviar e-mail', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <Text style={styles.title}>Recuperar Senha</Text>
          <Text style={styles.subtitle}>Digite seu e-mail para receber um link de redefinição de senha.</Text>

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  onBlur={onBlur}
                  onChangeText={(t) => onChange(t.replace(/\s/g, ''))}
                  value={value}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="seu@email.com"
                  placeholderTextColor={colors.textSecondary}
                  returnKeyType="done"
                />
                {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}
              </View>
            )}
          />

          <TouchableOpacity style={styles.button} onPress={handleSubmit(onSubmit)} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Enviar E-mail</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backLink}>
            <Text style={styles.backText}>Voltar para o Login</Text>
          </TouchableOpacity>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, padding: theme.spacing.lg, backgroundColor: colors.background, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.text, marginBottom: theme.spacing.sm, textAlign: 'center' },
  subtitle: { fontSize: 16, color: colors.textSecondary, marginBottom: theme.spacing.xl, textAlign: 'center' },
  inputContainer: { marginBottom: theme.spacing.lg },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, backgroundColor: colors.surface, color: colors.text },
  error: { color: colors.error, fontSize: 12, marginTop: 4 },
  button: { backgroundColor: colors.primary, padding: theme.spacing.md, borderRadius: theme.borderRadius.md, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  backLink: { marginTop: theme.spacing.xl, alignItems: 'center' },
  backText: { color: colors.primary, fontWeight: 'bold' },
});
