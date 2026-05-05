import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import KeyboardAwareContainer from '../../components/common/KeyboardAwareContainer';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { signUp } from '../../services/firebase/auth';
import { useAuthStore } from '../../store/authStore';
import { theme } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

const registerSchema = z.object({
  name: z.string()
    .min(1, 'Nome é obrigatório')
    .transform((v) => v.trim())
    .refine((v) => v.length >= 2, 'Nome deve ter pelo menos 2 caracteres')
    .refine((v) => v.length <= 100, 'Nome muito longo')
    .refine(
      (v) => /^[\p{L}\p{M}]+([ ][\p{L}\p{M}]+)*$/u.test(v),
      'Nome deve conter apenas letras'
    ),
  email: z.string()
    .min(1, 'E-mail é obrigatório')
    .transform((v) => v.trim())
    .refine((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'E-mail inválido')
    .refine((v) => v.length <= 254, 'E-mail muito longo'),
  password: z.string()
    .min(1, 'Senha é obrigatória')
    .min(8, 'A senha deve ter pelo menos 8 caracteres')
    .max(128, 'Senha muito longa')
    .refine((v) => /[A-Z]/.test(v), 'A senha deve conter pelo menos uma letra maiúscula')
    .refine((v) => /[a-z]/.test(v), 'A senha deve conter pelo menos uma letra minúscula')
    .refine((v) => /[0-9]/.test(v), 'A senha deve conter pelo menos um número')
    .refine((v) => /[^A-Za-z0-9]/.test(v), 'A senha deve conter pelo menos um caractere especial'),
  confirmPassword: z.string().min(1, 'Confirmação de senha é obrigatória'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

const PASSWORD_RULES = [
  { label: 'Mínimo 8 caracteres',  test: (v: string) => v.length >= 8 },
  { label: 'Uma letra maiúscula',  test: (v: string) => /[A-Z]/.test(v) },
  { label: 'Uma letra minúscula',  test: (v: string) => /[a-z]/.test(v) },
  { label: 'Um número',            test: (v: string) => /[0-9]/.test(v) },
  { label: 'Um caractere especial',test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

function PasswordStrength({ value }: { value: string }) {
  const { colors } = useTheme();
  if (!value) return null;
  const passed = PASSWORD_RULES.filter((r) => r.test(value)).length;
  const strength = passed <= 2 ? 'Fraca' : passed <= 4 ? 'Média' : 'Forte';
  const color = passed <= 2 ? colors.error : passed <= 4 ? '#F59E0B' : colors.success;
  return (
    <View style={strengthStyles.container}>
      <View style={strengthStyles.bars}>
        {PASSWORD_RULES.map((_, i) => (
          <View
            key={i}
            style={[strengthStyles.bar, { backgroundColor: i < passed ? color : colors.border }]}
          />
        ))}
      </View>
      <Text style={[strengthStyles.label, { color }]}>{strength}</Text>
      <View style={strengthStyles.rules}>
        {PASSWORD_RULES.map((r) => {
          const ok = r.test(value);
          return (
            <View key={r.label} style={strengthStyles.ruleRow}>
              <Feather name={ok ? 'check' : 'x'} size={11} color={ok ? colors.success : colors.textSecondary} />
              <Text style={[strengthStyles.ruleText, { color: colors.textSecondary }, ok && { color: colors.success }]}>{r.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export const RegisterScreen = () => {
  const [loading, setLoading] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');
  const { setUser } = useAuthStore();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const { control, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
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
    <KeyboardAwareContainer contentContainerStyle={styles.container}>
      <Text style={styles.title}>Crie sua conta</Text>

      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nome Completo</Text>
            <TextInput
              style={styles.input}
              onBlur={onBlur}
              onChangeText={(t) => onChange(t.replace(/[^\p{L}\p{M} ]/gu, ''))}
              value={value}
              placeholder="João da Silva"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              blurOnSubmit={false}
            />
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
            <TextInput
              ref={emailRef}
              style={styles.input}
              onBlur={onBlur}
              onChangeText={(t) => onChange(t.replace(/\s/g, ''))}
              value={value}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="seu@email.com"
              placeholderTextColor={colors.textSecondary}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              blurOnSubmit={false}
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
            <TextInput
              ref={passwordRef}
              style={styles.input}
              onBlur={onBlur}
              onChangeText={(t) => { onChange(t); setPasswordValue(t); }}
              value={value}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="******"
              placeholderTextColor={colors.textSecondary}
              returnKeyType="next"
              onSubmitEditing={() => confirmPasswordRef.current?.focus()}
              blurOnSubmit={false}
            />
            <PasswordStrength value={passwordValue} />
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
            <TextInput
              ref={confirmPasswordRef}
              style={styles.input}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="******"
              placeholderTextColor={colors.textSecondary}
              returnKeyType="done"
            />
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
    </KeyboardAwareContainer>
  );
};

const strengthStyles = StyleSheet.create({
  container: { marginTop: theme.spacing.sm, gap: 6 },
  bars: { flexDirection: 'row', gap: 4 },
  bar: { flex: 1, height: 4, borderRadius: 2 },
  label: { fontSize: 12, fontWeight: '700' },
  rules: { gap: 3 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ruleText: { fontSize: 12 },
});

const getStyles = (colors: any) => StyleSheet.create({
  container: { flexGrow: 1, padding: theme.spacing.lg, backgroundColor: colors.background, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.text, marginBottom: theme.spacing.xl, textAlign: 'center' },
  inputContainer: { marginBottom: theme.spacing.md },
  label: { marginBottom: theme.spacing.xs, color: colors.text },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: theme.borderRadius.md, padding: theme.spacing.md, backgroundColor: colors.surface, color: colors.text },
  error: { color: colors.error, fontSize: 12, marginTop: 4 },
  button: { backgroundColor: colors.primary, padding: theme.spacing.md, borderRadius: theme.borderRadius.md, alignItems: 'center', marginTop: theme.spacing.lg },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  loginLink: { marginTop: theme.spacing.xl, alignItems: 'center' },
  loginText: { color: colors.textSecondary },
  loginTextBold: { color: colors.primary, fontWeight: 'bold' },
});
