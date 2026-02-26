import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AUTH_KEY = '@stockpilot:auth';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(AUTH_KEY).then((raw) => {
      if (raw) {
        try {
          setUser(JSON.parse(raw));
        } catch {}
      }
      setIsLoading(false);
    });
  }, []);

  const login = async (email: string, password: string) => {
    const usersRaw = await AsyncStorage.getItem('@stockpilot:users');
    const users: Array<User & { password: string }> = usersRaw ? JSON.parse(usersRaw) : [];
    const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!found) throw new Error('Invalid email or password');
    const { password: _pw, ...u } = found;
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(u));
    setUser(u);
  };

  const register = async (email: string, password: string, name: string) => {
    const usersRaw = await AsyncStorage.getItem('@stockpilot:users');
    const users: Array<User & { password: string }> = usersRaw ? JSON.parse(usersRaw) : [];
    if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('An account with this email already exists');
    }
    const newUser: User & { password: string } = {
      id: `user_${Date.now()}`,
      email: email.toLowerCase().trim(),
      name: name.trim(),
      createdAt: new Date().toISOString(),
      password,
    };
    users.push(newUser);
    await AsyncStorage.setItem('@stockpilot:users', JSON.stringify(users));
    const { password: _pw, ...u } = newUser;
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(u));
    setUser(u);
  };

  const logout = async () => {
    await AsyncStorage.removeItem(AUTH_KEY);
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, isLoading, login, register, logout }),
    [user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
