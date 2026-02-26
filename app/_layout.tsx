import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { queryClient } from '@/lib/query-client';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { InventoryProvider } from '@/contexts/InventoryContext';
import { ToastProvider } from '@/components/Toast';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useColorScheme } from 'react-native';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [user, isLoading]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="product/new" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="product/[id]" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <KeyboardProvider>
            <AuthProvider>
              <InventoryProvider>
                <ToastProvider>
                  <RootLayoutNav />
                </ToastProvider>
              </InventoryProvider>
            </AuthProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
