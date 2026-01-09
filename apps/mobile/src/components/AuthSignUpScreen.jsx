import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, Lock, Eye, EyeOff, User } from 'lucide-react-native';
import { useTheme } from '@/utils/theme';
import { resolveApiUrl } from '@/utils/api';
import { useAuthStore } from '@/utils/auth/store';

export default function AuthSignUpScreen({ onSwitchToSignIn }) {
  const { isDark } = useTheme();
  const { setAuth } = useAuthStore();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const bg = isDark ? '#000' : '#F9FAFB';
  const textPrimary = isDark ? '#fff' : '#1A1A1A';
  const textSecondary = isDark ? 'rgba(255,255,255,0.70)' : '#6B7280';
  const inputBg = isDark ? 'rgba(255,255,255,0.08)' : '#fff';
  const borderColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
  const buttonBg = isDark ? '#FFFFFF' : '#1F2937';
  const buttonText = isDark ? '#000' : '#fff';

  const handleSignUp = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const url = resolveApiUrl('/api/auth/native-signup');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: name.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'An error occurred during sign up');
        setLoading(false);
        return;
      }

      // Store auth data
      setAuth({
        jwt: data.jwt,
        user: data.user,
      });

      // Navigate away
      router.back();
    } catch (err) {
      console.error('Sign up error:', err);
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  }, [name, email, password, setAuth, router]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 20,
          paddingTop: 60,
          paddingBottom: 40,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text
          style={{
            fontFamily: 'Poppins_600SemiBold',
            fontSize: 32,
            color: textPrimary,
            marginBottom: 8,
          }}
        >
          Create account
        </Text>
        <Text
          style={{
            fontFamily: 'Roboto_400Regular',
            fontSize: 15,
            color: textSecondary,
            marginBottom: 32,
          }}
        >
          Start your journey with us today by entering your details.
        </Text>

        {error ? (
          <View
            style={{
              backgroundColor: isDark
                ? 'rgba(239,68,68,0.15)'
                : 'rgba(239,68,68,0.1)',
              padding: 12,
              borderRadius: 12,
              marginBottom: 20,
            }}
          >
            <Text
              style={{
                fontFamily: 'Roboto_400Regular',
                fontSize: 14,
                color: '#EF4444',
              }}
            >
              {error}
            </Text>
          </View>
        ) : null}

        <View style={{ marginBottom: 16 }}>
          <Text
            style={{
              fontFamily: 'Roboto_400Regular',
              fontSize: 14,
              color: textSecondary,
              marginBottom: 8,
            }}
          >
            Full Name
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: inputBg,
              borderRadius: 16,
              borderWidth: 1,
              borderColor,
              paddingHorizontal: 16,
              height: 56,
            }}
          >
            <User size={20} color={textSecondary} />
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Full Name"
              placeholderTextColor={textSecondary}
              autoCapitalize="words"
              autoCorrect={false}
              style={{
                flex: 1,
                marginLeft: 12,
                fontFamily: 'Roboto_400Regular',
                fontSize: 15,
                color: textPrimary,
              }}
            />
          </View>
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text
            style={{
              fontFamily: 'Roboto_400Regular',
              fontSize: 14,
              color: textSecondary,
              marginBottom: 8,
            }}
          >
            Email address
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: inputBg,
              borderRadius: 16,
              borderWidth: 1,
              borderColor,
              paddingHorizontal: 16,
              height: 56,
            }}
          >
            <Mail size={20} color={textSecondary} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor={textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                flex: 1,
                marginLeft: 12,
                fontFamily: 'Roboto_400Regular',
                fontSize: 15,
                color: textPrimary,
              }}
            />
          </View>
        </View>

        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
              fontFamily: 'Roboto_400Regular',
              fontSize: 14,
              color: textSecondary,
              marginBottom: 8,
            }}
          >
            Password
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: inputBg,
              borderRadius: 16,
              borderWidth: 1,
              borderColor,
              paddingHorizontal: 16,
              height: 56,
            }}
          >
            <Lock size={20} color={textSecondary} />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={textSecondary}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                flex: 1,
                marginLeft: 12,
                fontFamily: 'Roboto_400Regular',
                fontSize: 15,
                color: textPrimary,
              }}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={{ padding: 8 }}
            >
              {showPassword ? (
                <EyeOff size={20} color={textSecondary} />
              ) : (
                <Eye size={20} color={textSecondary} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSignUp}
          disabled={loading}
          style={{
            backgroundColor: buttonBg,
            borderRadius: 18,
            height: 56,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          {loading ? (
            <ActivityIndicator color={buttonText} />
          ) : (
            <Text
              style={{
                fontFamily: 'Poppins_600SemiBold',
                fontSize: 16,
                color: buttonText,
              }}
            >
              Sign Up
            </Text>
          )}
        </TouchableOpacity>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginVertical: 24,
          }}
        >
          <View
            style={{
              flex: 1,
              height: 1,
              backgroundColor: borderColor,
            }}
          />
          <Text
            style={{
              marginHorizontal: 16,
              fontFamily: 'Roboto_400Regular',
              fontSize: 14,
              color: textSecondary,
            }}
          >
            Or sign up with
          </Text>
          <View
            style={{
              flex: 1,
              height: 1,
              backgroundColor: borderColor,
            }}
          />
        </View>

        <View
          style={{
            flexDirection: 'row',
            gap: 12,
            marginBottom: 32,
          }}
        >
          {/* Google button - placeholder for now */}
          <TouchableOpacity
            style={{
              flex: 1,
              height: 56,
              backgroundColor: inputBg,
              borderRadius: 16,
              borderWidth: 1,
              borderColor,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            disabled
          >
            <Text style={{ color: textSecondary }}>G</Text>
          </TouchableOpacity>

          {/* Apple button - placeholder for now */}
          <TouchableOpacity
            style={{
              flex: 1,
              height: 56,
              backgroundColor: inputBg,
              borderRadius: 16,
              borderWidth: 1,
              borderColor,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            disabled
          >
            <Text style={{ color: textSecondary }}>🍎</Text>
          </TouchableOpacity>
        </View>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontFamily: 'Roboto_400Regular',
              fontSize: 14,
              color: textSecondary,
            }}
          >
            Already have an account?{' '}
          </Text>
          <TouchableOpacity onPress={onSwitchToSignIn}>
            <Text
              style={{
                fontFamily: 'Poppins_600SemiBold',
                fontSize: 14,
                color: '#8B5CF6',
              }}
            >
              Sign in
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}


