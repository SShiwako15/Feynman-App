import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { signIn, signUp, signOut, getCurrentUser, confirmSignUp, resendSignUpCode, resetPassword, confirmResetPassword, type SignUpOutput, type SignInOutput } from 'aws-amplify/auth';

interface User {
  id: string;
  email: string;
  name: string;
  subject?: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (emailOrUsername: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  confirmRegistration: (username: string, code: string) => Promise<void>;
  resendConfirmationCode: (username: string) => Promise<void>;
  forgotPasswordRequest: (email: string) => Promise<void>;
  confirmPasswordReset: (email: string, code: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const currentUser = await getCurrentUser();
      await loadUserData(currentUser);
    } catch (error) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserData = async (cognitoUser: { userId: string; username: string }) => {
    try {

      const userData: User = {
        id: cognitoUser.userId,
        email: cognitoUser.username,
        name: cognitoUser.username.split('@')[0],
        subject: '',
      };
      setUser(userData);
    } catch (error) {
      console.error('Error loading user data:', error);
      setUser(null);
    }
  };

  const login = async (emailOrUsername: string, password: string) => {
    try {
      // Cognito accepts either username or email (if email alias is enabled in User Pool)
      // We'll pass the input directly as username - Cognito will handle it if email alias is configured
      const signInOutput: SignInOutput = await signIn({
        username: emailOrUsername.trim(),
        password: password,
      });

      if (signInOutput.isSignedIn) {
        const currentUser = await getCurrentUser();
        await loadUserData(currentUser);
      } else {
        throw new Error('Sign in failed');
      }
    } catch (error: any) {
      // Handle specific AWS Cognito errors
      let errorMessage = 'Invalid email/username or password';
      if (error.name === 'ConfigurationError' || error.message?.includes('not configured')) {
        errorMessage = 'AWS Cognito is not configured. Please check your .env file and ensure VITE_AWS_COGNITO_USER_POOL_ID, VITE_AWS_COGNITO_USER_POOL_CLIENT_ID, and VITE_AWS_REGION are set.';
      } else if (error.name === 'UserNotConfirmedException') {
        errorMessage = 'Please confirm your email address before logging in.';
      } else if (error.name === 'NotAuthorizedException') {
        errorMessage = 'Invalid email/username or password';
      } else if (error.name === 'UserNotFoundException') {
        errorMessage = 'No account found with this email/username.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      throw new Error(errorMessage);
    }
  };

  const register = async (username: string, email: string, password: string, name: string) => {
    try {
      const userAttributes: Record<string, string> = {
        email: email,
      };
      if (name && name.trim()) {
        userAttributes.name = name.trim();
      }

      const signUpOutput: SignUpOutput = await signUp({
        username: username,
        password: password,
        options: {
          userAttributes: userAttributes,
        },
      });

      // Registration successful, waiting for confirmation
      if (signUpOutput.nextStep.signUpStep !== 'CONFIRM_SIGN_UP') {
        //If auto-confirm,
        const currentUser = await getCurrentUser();
        await loadUserData(currentUser);
      }
    } catch (error: any) {      
      let errorMessage = error.message || 'Registration failed';
      
      // Error messages
      if (error.name === 'ConfigurationError' || error.message?.includes('not configured')) {
        errorMessage = 'AWS Cognito is not configured. Please check your .env file and ensure VITE_AWS_COGNITO_USER_POOL_ID, VITE_AWS_COGNITO_USER_POOL_CLIENT_ID, and VITE_AWS_REGION are set.';
      } else if (error.name === 'InvalidParameterException') {
        errorMessage = `Invalid registration parameters: ${error.message || 'Please check your input. Make sure username, email and name are valid, and password meets requirements (usually 8+ characters with uppercase, lowercase, number, and special character).'}`;
      } else if (error.name === 'UsernameExistsException') {
        errorMessage = 'An account with this username already exists.';
      } else if (error.name === 'InvalidPasswordException') {
        errorMessage = 'Password does not meet requirements. Please ensure it has at least 8 characters with uppercase, lowercase, number, and special character.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  };

  const confirmRegistration = async (username: string, code: string) => {
    try {
      await confirmSignUp({
        username: username,
        confirmationCode: code,
      });
    } catch (error: any) {
      const errorMessage = error.message || 'Confirmation failed';
      throw new Error(errorMessage);
    }
  };

  const resendConfirmationCode = async (username: string) => {
    try {
      await resendSignUpCode({
        username: username,
      });
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to resend confirmation code';
      throw new Error(errorMessage);
    }
  };

  const logout = async () => {
    try {
      await signOut();
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
      // Still clear local state even if signOut fails
      setUser(null);
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
    }
  };

  const forgotPasswordRequest = async (email: string) => {
    try {
      await resetPassword({
        username: email,
      });
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to send password reset code';
      throw new Error(errorMessage);
    }
  };

  const confirmPasswordReset = async (email: string, code: string, newPassword: string) => {
    try {
      await confirmResetPassword({
        username: email,
        confirmationCode: code,
        newPassword: newPassword,
      });
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to reset password';
      throw new Error(errorMessage);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateUser,
        confirmRegistration,
        resendConfirmationCode,
        forgotPasswordRequest,
        confirmPasswordReset,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
