import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { signIn } from '../../services/firebase/auth';
import { theme } from '../../constants/theme';

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

export const LoginScreen = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<any>();

  const { control, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const getFirebaseErrorMessage = (error: any) => {
    switch (error.code) {
      case 'auth/user-not-found': return 'Nenhuma conta encontrada com este e-mail. Verifique e tente novamente.';
      case 'auth/wrong-password': return 'Senha incorreta. Verifique sua senha e tente novamente.';
      case 'auth/invalid-credential': return 'E-mail ou senha incorretos. Verifique seus dados e tente novamente.';
      case 'auth/too-many-requests': return 'Muitas tentativas seguidas. Aguarde alguns minutos antes de tentar novamente.';
      case 'auth/network-request-failed': return 'Sem conexão com a internet. Verifique sua rede e tente novamente.';
      default: return 'Não foi possível fazer o login. Tente novamente.';
    }
  };

  const onSubmit = async (data: LoginForm) => {
    try {
      setLoading(true);
      await signIn(data.email, data.password);
    } catch (error: any) {
      Alert.alert('Falha no login', getFirebaseErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>receitinha</Text>
        <Text style={styles.subtitle}>Bem-vindo de volta!</Text>
      </View>

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>E-mail</Text>
            <TextInput
              style={styles.input}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="seu@email.com"
              placeholderTextColor="#aaa"
              returnKeyType="done"
            />
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
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                secureTextEntry={!showPassword}
                placeholder="sua senha"
                placeholderTextColor="#aaa"
                returnKeyType="done"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Feather name={showPassword ? 'eye-off' : 'eye'} size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.error}>{errors.password.message}</Text>}
          </View>
        )}
      />

      <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
        <Text style={styles.forgotPassword}>Esqueci minha senha</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleSubmit(onSubmit)} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Entrar</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.registerLink}>
        <Text style={styles.registerText}>Não tem uma conta? <Text style={styles.registerTextBold}>Cadastre-se</Text></Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: theme.spacing.lg, backgroundColor: theme.colors.background, justifyContent: 'center' },
  logoContainer: { alignItems: 'center', marginBottom: theme.spacing.xl },
  logo: { fontSize: 42, fontWeight: 'bold', color: theme.colors.primary, letterSpacing: 1 },
  subtitle: { fontSize: 16, color: theme.colors.textSecondary, marginTop: theme.spacing.xs },
  title: { fontSize: 28, fontWeight: 'bold', color: theme.colors.text, marginBottom: theme.spacing.xl, textAlign: 'center' },
  inputContainer: { marginBottom: theme.spacing.md },
  label: { marginBottom: theme.spacing.xs, color: theme.colors.text },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, backgroundColor: theme.colors.surface },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, paddingRight: theme.spacing.md, backgroundColor: theme.colors.surface },
  passwordInput: { flex: 1, padding: theme.spacing.md },
  error: { color: theme.colors.error, fontSize: 12, marginTop: 4 },
  forgotPassword: { color: theme.colors.primary, textAlign: 'right', marginBottom: theme.spacing.lg },
  button: { backgroundColor: theme.colors.primary, padding: theme.spacing.md, borderRadius: theme.borderRadius.md, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  registerLink: { marginTop: theme.spacing.xl, alignItems: 'center' },
  registerText: { color: theme.colors.textSecondary },
  registerTextBold: { color: theme.colors.primary, fontWeight: 'bold' }
});
