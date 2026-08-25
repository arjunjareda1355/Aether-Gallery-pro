import React from 'react';
import { ClerkProvider as BaseClerkProvider } from '@clerk/clerk-react';
import { dark } from '@clerk/themes';

const DEFAULT_CLERK_KEY = 'pk_test_Y2FzdWFsLXN0YWxsaW9uLTQyNTYuY2xlcmsuYWNjb3VudHMuZGV2JA';

function getSanitizedClerkKey(): string {
  const raw = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  if (!raw || typeof raw !== 'string') {
    return DEFAULT_CLERK_KEY;
  }
  let str = raw.trim();
  if (str.includes('CLERK_SECRET_KEY')) {
    str = str.split('CLERK_SECRET_KEY')[0].trim();
  }
  if (str.includes('sk_test_') || str.includes('sk_live_')) {
    str = str.split(/sk_(?:test|live)_/)[0].trim();
  }
  if (str.startsWith('pk_test_') || str.startsWith('pk_live_')) {
    return str;
  }
  return DEFAULT_CLERK_KEY;
}

const CLERK_PUBLISHABLE_KEY = getSanitizedClerkKey();

interface ClerkAuthProviderProps {
  children: React.ReactNode;
}

export function ClerkAuthProvider({ children }: ClerkAuthProviderProps) {
  return (
    <BaseClerkProvider 
      publishableKey={CLERK_PUBLISHABLE_KEY}
      telemetry={false}
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: '#f97316',
          colorBackground: '#0e0e12',
          colorInputBackground: '#18181f',
          colorInputText: '#ffffff',
          colorText: '#ffffff',
          colorTextSecondary: '#a1a1aa',
          borderRadius: '0.875rem',
          fontFamily: 'inherit',
        },
        elements: {
          card: 'bg-card-dark border border-white/10 shadow-2xl rounded-3xl backdrop-blur-xl',
          formButtonPrimary: 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-2.5 rounded-xl shadow-lg transition-all active:scale-[0.98]',
          socialButtonsBlockButton: 'border border-white/10 hover:bg-white/10 text-white rounded-xl transition-all active:scale-[0.98]',
          formFieldInput: 'bg-white/5 border border-white/10 text-white rounded-xl focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all',
          footerActionLink: 'text-orange-400 hover:text-orange-300 font-semibold',
          headerTitle: 'font-black tracking-tight text-white text-lg',
          headerSubtitle: 'text-text-dim text-xs',
        }
      }}
    >
      {children}
    </BaseClerkProvider>
  );
}

export { 
  useUser, 
  useClerk, 
  useAuth, 
  SignInButton, 
  SignUpButton, 
  UserButton, 
  UserProfile,
  SignIn,
  SignUp,
  SignedIn, 
  SignedOut 
} from '@clerk/clerk-react';

