import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Alert, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigation } from '@react-navigation/native';
import { signUp } from '../../services/firebase/auth';
import { useAuthStore } from '../../store/authStore';
import { theme } from '../../constants/theme';

const registerSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof registerSchema>;

export const RegisterScreen = () => {
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuthStore();
  const navigation = useNavigation<any>();

  const { control, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const getFirebaseErrorMessage = (error: any) => {
    switch (error.code) {
      case 'auth/email-already-in-use': return 'Este e-mail já está cadastrado. Tente fazer login ou use outro e-mail.';
      case 'auth/invalid-email': return 'O formato do e-mail é inválido. Verifique e tente novamente.';
      case 'auth/network-request-failed': return 'Sem conexão com a internet. Verifique sua rede e tente novamente.';
      default: return 'Não foi possível criar a conta. Tente novamente.';
    }
  };

  const onSubmit = async (data: RegisterForm) => {
    try {
      setLoading(true);
      const user = await signUp(data.email, data.password, data.name);

      setUser({
        id: user.uid,
        name: data.name,
        email: data.email,
        createdAt: new Date(),
      });
    } catch (error: any) {
      Alert.alert('Erro', getFirebaseErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
        <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Crie sua conta</Text>

      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nome Completo</Text>
            <TextInput style={styles.input} onBlur={onBlur} onChangeText={onChange} value={value} placeholder="João da Silva" returnKeyType="done" />
            {errors.name && <Text style={styles.error}>{errors.name.message}</Text>}
          </View>
        )}
      />

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>E-mail</Text>
            <TextInput style={styles.input} onBlur={onBlur} onChangeText={onChange} value={value} keyboardType="email-address" autoCapitalize="none" placeholder="seu@email.com" returnKeyType="done" />
            {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}
          </View>
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Senha</Text>
            <TextInput style={styles.input} onBlur={onBlur} onChangeText={onChange} value={value} secureTextEntry placeholder="******" returnKeyType="done" />
            {errors.password && <Text style={styles.error}>{errors.password.message}</Text>}
          </View>
        )}
      />

      <Controller
        control={control}
        name="confirmPassword"
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirmar Senha</Text>
            <TextInput style={styles.input} onBlur={onBlur} onChangeText={onChange} value={value} secureTextEntry placeholder="******" returnKeyType="done" />
            {errors.confirmPassword && <Text style={styles.error}>{errors.confirmPassword.message}</Text>}
          </View>
        )}
      />

      <TouchableOpacity style={styles.button} onPress={handleSubmit(onSubmit)} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Cadastrar</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.loginLink}>
        <Text style={styles.loginText}>Já tem uma conta? <Text style={styles.loginTextBold}>Entrar</Text></Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: theme.spacing.lg, backgroundColor: theme.colors.background, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: theme.colors.text, marginBottom: theme.spacing.xl, textAlign: 'center' },
  inputContainer: { marginBottom: theme.spacing.md },
  label: { marginBottom: theme.spacing.xs, color: theme.colors.text },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, backgroundColor: theme.colors.surface },
  error: { color: theme.colors.error, fontSize: 12, marginTop: 4 },
  button: { backgroundColor: theme.colors.primary, padding: theme.spacing.md, borderRadius: theme.borderRadius.md, alignItems: 'center', marginTop: theme.spacing.lg },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  loginLink: { marginTop: theme.spacing.xl, alignItems: 'center' },
  loginText: { color: theme.colors.textSecondary },
  loginTextBold: { color: theme.colors.primary, fontWeight: 'bold' }
});
