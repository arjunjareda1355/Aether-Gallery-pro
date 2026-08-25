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

export const AETHER_CLERK_LOCALIZATION = {
  signIn: {
    start: {
      title: "Sign in to Aether",
      subtitle: "Welcome back! Enter your credentials to access the Sanctuary",
      actionText: "Don't have an account?",
      actionLink: "Sign up",
    },
    password: {
      title: "Enter your password",
      subtitle: "to continue to Aether",
      actionLink: "Use another method"
    },
    emailCode: {
      title: "Check your email",
      subtitle: "to continue to Aether",
      formTitle: "Verification Code",
      formSubtitle: "Enter the code sent to your email to access Aether"
    },
    phoneCode: {
      title: "Check your phone",
      subtitle: "to continue to Aether"
    },
    resetPasswordCode: {
      title: "Reset your password",
      subtitle: "to continue to Aether"
    },
    forgotPassword: {
      title: "Forgot password?",
      subtitle: "to continue to Aether"
    }
  },
  signUp: {
    start: {
      title: "Create your Aether Account",
      subtitle: "Welcome to Aether Sanctuary! Enter your details to begin",
      actionText: "Already have an account?",
      actionLink: "Sign in",
    },
    emailCode: {
      title: "Verify your email",
      subtitle: "to continue to Aether"
    },
    phoneCode: {
      title: "Verify your phone",
      subtitle: "to continue to Aether"
    }
  },
  userProfile: {
    navbar: {
      title: "Aether Identity Profile",
    }
  }
};

interface ClerkAuthProviderProps {
  children: React.ReactNode;
}

export function ClerkAuthProvider({ children }: ClerkAuthProviderProps) {
  return (
    <BaseClerkProvider 
      publishableKey={CLERK_PUBLISHABLE_KEY}
      localization={AETHER_CLERK_LOCALIZATION}
      appearance={{
        baseTheme: dark,
        layout: {
          unsafe_disableDevelopmentModeWarnings: true,
          socialButtonsPlacement: 'top',
          socialButtonsVariant: 'iconButton',
          showOptionalFields: false,
          logoPlacement: 'none',
        },
        variables: {
          colorPrimary: '#f27d26',
          colorTextOnPrimaryBackground: '#ffffff',
          colorBackground: '#0a0a0c',
          colorInputBackground: '#141419',
          colorInputText: '#ffffff',
          colorText: '#ffffff',
          colorTextSecondary: '#9ca3af',
          borderRadius: '1rem',
        },
        elements: {
          card: 'bg-card-dark border border-white/10 shadow-2xl rounded-3xl',
          headerTitle: 'font-black tracking-tight text-white text-base',
          headerSubtitle: 'text-zinc-400 text-xs mt-1',
          socialButtonsRoot: 'flex justify-center gap-3 w-full mb-2',
          socialButtons: 'flex justify-center gap-3 w-full',
          socialButtonsIconButton: 'border border-white/15 bg-white/5 hover:bg-white/10 text-white rounded-2xl p-3 h-12 w-12 flex items-center justify-center transition-all shadow-md hover:scale-105',
          socialButtonsBlockButton: 'border border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all',
          socialButtonsBlockButtonText: 'hidden',
          formButtonPrimary: '!bg-orange-500 hover:!bg-orange-600 !text-white font-black py-3 px-6 rounded-2xl shadow-lg !shadow-orange-500/20 uppercase tracking-wider text-xs transition-all !opacity-100',
          formButtonPrimaryText: '!text-white font-black uppercase tracking-wider text-xs',
          formFieldInput: 'bg-white/5 border border-white/10 text-white rounded-xl focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all placeholder:text-zinc-500 text-sm font-medium',
          formFieldLabel: 'text-xs font-bold text-zinc-300 uppercase tracking-wide',
          footerActionLink: 'text-orange-400 hover:text-orange-300 font-bold',
          footerActionText: 'text-zinc-400 text-xs',
          footer: 'hidden',
          footerAction: 'hidden',
          dividerLine: 'bg-white/10',
          dividerText: 'text-zinc-500 text-[11px] uppercase font-bold tracking-wider',
          identityPreviewText: 'text-white font-medium',
          identityPreviewEditButton: 'text-orange-400 hover:text-orange-300',
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

