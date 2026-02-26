import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  useColorScheme, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/colors';
import * as Haptics from 'expo-haptics';

export default function RegisterScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password || !confirm) {
      setError('Por favor completa todos los campos');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await register(email.trim(), password, name.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e.message ?? 'Error al registrarse');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 0) + 24, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={[styles.logoBox, { backgroundColor: theme.accent + '22' }]}>
            <Ionicons name="cube" size={36} color={theme.accent} />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Crear cuenta</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Comienza a gestionar tu inventario</Text>
        </View>

        <View style={styles.form}>
          {error ? (
            <View style={[styles.errorBox, { backgroundColor: theme.danger + '18' }]}>
              <Ionicons name="alert-circle" size={16} color={theme.danger} />
              <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
            </View>
          ) : null}

          {[
            { label: 'Nombre completo', value: name, onChange: setName, placeholder: 'Juan Pérez', icon: 'person-outline', type: 'default' },
            { label: 'Correo electrónico', value: email, onChange: setEmail, placeholder: 'tu@ejemplo.com', icon: 'mail-outline', type: 'email-address' },
          ].map((f) => (
            <View key={f.label}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>{f.label}</Text>
              <View style={[styles.inputWrap, { backgroundColor: theme.backgroundTertiary, borderColor: theme.cardBorder }]}>
                <Ionicons name={f.icon as any} size={18} color={theme.textTertiary} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  value={f.value}
                  onChangeText={f.onChange}
                  placeholder={f.placeholder}
                  placeholderTextColor={theme.placeholder}
                  keyboardType={f.type as any}
                  autoCapitalize={f.type === 'email-address' ? 'none' : 'words'}
                />
              </View>
            </View>
          ))}

          <View>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Contraseña</Text>
            <View style={[styles.inputWrap, { backgroundColor: theme.backgroundTertiary, borderColor: theme.cardBorder }]}>
              <Ionicons name="lock-closed-outline" size={18} color={theme.textTertiary} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Mín. 6 caracteres"
                placeholderTextColor={theme.placeholder}
                secureTextEntry={!showPw}
                autoCapitalize="none"
              />
              <Pressable onPress={() => setShowPw(!showPw)}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.textTertiary} />
              </Pressable>
            </View>
          </View>

          <View>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Confirmar contraseña</Text>
            <View style={[styles.inputWrap, { backgroundColor: theme.backgroundTertiary, borderColor: theme.cardBorder }]}>
              <Ionicons name="lock-closed-outline" size={18} color={theme.textTertiary} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Repite la contraseña"
                placeholderTextColor={theme.placeholder}
                secureTextEntry={!showPw}
                autoCapitalize="none"
              />
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [styles.btn, { backgroundColor: theme.accent, opacity: pressed || loading ? 0.85 : 1 }]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.btnText}>{loading ? 'Creando...' : 'Crear cuenta'}</Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>¿Ya tienes una cuenta?</Text>
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text style={[styles.link, { color: theme.accent }]}> Iniciar sesión</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  header: { alignItems: 'center', marginBottom: 36, gap: 10 },
  logoBox: { width: 76, height: 76, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  subtitle: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  form: { gap: 14 },
  label: { fontSize: 13, fontFamily: 'Inter_500Medium', marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, height: 52,
  },
  input: { flex: 1, fontSize: 15, fontFamily: 'Inter_400Regular' },
  btn: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  btnText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#0D1117' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 12 },
  errorText: { fontSize: 14, fontFamily: 'Inter_400Regular', flex: 1 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 28, alignItems: 'center' },
  footerText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  link: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
});
