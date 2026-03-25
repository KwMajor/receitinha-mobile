import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigation } from '@react-navigation/native';
import { resetPassword } from '../../services/firebase/auth';
import { theme } from '../../constants/theme';

const forgotPasswordSchema = z.object({
  email: z.string().email('E-mail inválido'),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export const ForgotPasswordScreen = () => {
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const { control, handleSubmit, formState: { errors } } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    try {
      setLoading(true);
      await resetPassword(data.email);
      Alert.alert('E-mail enviado!', `Enviamos as instruções de recuperação para ${data.email}. Verifique sua caixa de entrada (e também a pasta de spam).`);
      navigation.goBack();
    } catch (error: any) {
      const errorMessage = error.code === 'auth/user-not-found'
        ? 'Não encontramos nenhuma conta com este e-mail. Verifique o endereço informado.'
        : error.code === 'auth/network-request-failed'
        ? 'Sem conexão com a internet. Verifique sua rede e tente novamente.'
        : 'Não foi possível enviar o e-mail de recuperação. Tente novamente.';
      Alert.alert('Erro ao enviar e-mail', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
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
              onChangeText={onChange}
              value={value}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="seu@email.com"
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
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: theme.spacing.lg, backgroundColor: theme.colors.background, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: theme.colors.text, marginBottom: theme.spacing.sm, textAlign: 'center' },
  subtitle: { fontSize: 16, color: theme.colors.textSecondary, marginBottom: theme.spacing.xl, textAlign: 'center' },
  inputContainer: { marginBottom: theme.spacing.lg },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, backgroundColor: theme.colors.surface },
  error: { color: theme.colors.error, fontSize: 12, marginTop: 4 },
  button: { backgroundColor: theme.colors.primary, padding: theme.spacing.md, borderRadius: theme.borderRadius.md, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  backLink: { marginTop: theme.spacing.xl, alignItems: 'center' },
  backText: { color: theme.colors.primary, fontWeight: 'bold' }
});