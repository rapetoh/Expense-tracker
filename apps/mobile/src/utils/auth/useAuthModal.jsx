import React, { useState, useCallback, useEffect } from 'react';
import { Modal, View } from 'react-native';
import { useTheme } from '@/utils/theme';
import { useAuthStore, useAuthModal } from './store';
import AuthSignInScreen from '@/components/AuthSignInScreen';
import AuthSignUpScreen from '@/components/AuthSignUpScreen';

/**
 * This component renders a modal for authentication purposes.
 * To show it programmatically, you should either use the `useRequireAuth` hook or the `useAuthModal` hook.
 *
 * @example
 * ```js
 * import { useAuthModal } from '@/utils/auth/useAuthModal';
 * function MyComponent() {
 * const { open } = useAuthModal();
 * return <Button title="Login" onPress={() => open({ mode: 'signin' })} />;
 * }
 * ```
 *
 * @example
 * ```js
 * import { useRequireAuth } from '@/utils/auth/useAuth';
 * function MyComponent() {
 *   // automatically opens the auth modal if the user is not authenticated
 *   useRequireAuth();
 *   return <Text>Protected Content</Text>;
 * }
 *
 */
export const AuthModal = () => {
  const { isOpen, mode, close } = useAuthModal();
  const { auth } = useAuthStore();
  const { isDark } = useTheme();
  const [currentMode, setCurrentMode] = useState(mode || 'signin');

  // Sync mode when it changes externally
  useEffect(() => {
    if (mode) {
      setCurrentMode(mode);
    }
  }, [mode]);

  const bg = isDark ? '#000' : '#F9FAFB';

  const handleSwitchToSignUp = useCallback(() => {
    setCurrentMode('signup');
  }, []);

  const handleSwitchToSignIn = useCallback(() => {
    setCurrentMode('signin');
  }, []);

  return (
    <Modal
      visible={isOpen && !auth}
      transparent={false}
      animationType="slide"
      onRequestClose={() => {}} // Prevent dismissal - users must authenticate
    >
      <View style={{ flex: 1, backgroundColor: bg }}>
        {currentMode === 'signin' ? (
          <AuthSignInScreen onSwitchToSignUp={handleSwitchToSignUp} />
        ) : (
          <AuthSignUpScreen onSwitchToSignIn={handleSwitchToSignIn} />
        )}
      </View>
    </Modal>
  );
};

export default useAuthModal;