import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useMemo } from 'react';
import { create } from 'zustand';
import { Modal, View } from 'react-native';
import { useAuthModal, useAuthStore, authKey } from './store';


/**
 * This hook provides authentication functionality.
 * It may be easier to use the `useAuthModal` or `useRequireAuth` hooks
 * instead as those will also handle showing authentication to the user
 * directly.
 */
export const useAuth = () => {
  const { isReady, auth, setAuth } = useAuthStore();
  const { isOpen, close, open } = useAuthModal();

  const initiate = useCallback(() => {
    // Add timeout to prevent infinite hang
    const timeout = setTimeout(() => {
      // Force ready if SecureStore takes too long
      useAuthStore.setState({
        auth: null,
        isReady: true,
      });
    }, 2000); // 2 second timeout for SecureStore

    SecureStore.getItemAsync(authKey)
      .then((auth) => {
        clearTimeout(timeout);
        useAuthStore.setState({
          auth: auth ? JSON.parse(auth) : null,
          isReady: true,
        });
      })
      .catch((error) => {
        clearTimeout(timeout);
        console.error('[Auth] Failed to load from SecureStore:', error);
        // Graceful degradation - continue without auth
        useAuthStore.setState({
          auth: null,
          isReady: true,
        });
      });
  }, []);

  useEffect(() => {}, []);

  const signIn = useCallback(() => {
    open({ mode: 'signin' });
  }, [open]);
  const signUp = useCallback(() => {
    open({ mode: 'signup' });
  }, [open]);

  const signOut = useCallback(() => {
    setAuth(null);
    close();
  }, [close]);

  return {
    isReady,
    isAuthenticated: isReady ? !!auth : null,
    signIn,
    signOut,
    signUp,
    auth,
    setAuth,
    initiate,
  };
};

/**
 * This hook will automatically open the authentication modal if the user is not authenticated.
 */
export const useRequireAuth = (options) => {
  const { isAuthenticated, isReady } = useAuth();
  const { open } = useAuthModal();

  useEffect(() => {
    if (!isAuthenticated && isReady) {
      open({ mode: options?.mode });
    }
  }, [isAuthenticated, open, options?.mode, isReady]);
};

export default useAuth;