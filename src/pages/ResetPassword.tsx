import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';

interface ResetPasswordForm {
  email: string;
}

interface ConfirmResetForm {
  code: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ResetPassword() {
  const { forgotPasswordRequest, confirmPasswordReset } = useAuth();
  const [step, setStep] = useState<'request' | 'confirm'>('request');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    register: registerRequest,
    handleSubmit: handleSubmitRequest,
    formState: { errors: errorsRequest },
  } = useForm<ResetPasswordForm>();

  const {
    register: registerConfirm,
    handleSubmit: handleSubmitConfirm,
    formState: { errors: errorsConfirm },
    watch: watchConfirm,
  } = useForm<ConfirmResetForm>();

  const newPassword = watchConfirm('newPassword');

  const onRequestSubmit = async (data: ResetPasswordForm) => {
    setLoading(true);
    setError('');
    try {
      await forgotPasswordRequest(data.email);
      setEmail(data.email);
      setStep('confirm');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onConfirmSubmit = async (data: ConfirmResetForm) => {
    if (data.newPassword !== data.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await confirmPasswordReset(email, data.code, data.newPassword);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 to-purple-700 p-5">
        <div className="bg-white rounded-xl shadow-2xl p-10 w-full max-w-md">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Password Reset Successful</h1>
          <p className="text-gray-600 mb-8">
            Your password has been successfully reset. You can now login with your new password.
          </p>
          <Link
            to="/login"
            className="block w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 rounded-lg font-semibold text-base text-center hover:from-purple-600 hover:to-purple-700 transform hover:-translate-y-0.5 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  if (step === 'confirm') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 to-purple-700 p-5">
        <div className="bg-white rounded-xl shadow-2xl p-10 w-full max-w-md">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Reset Password</h1>
          <p className="text-gray-600 mb-8">
            We've sent a verification code to <strong>{email}</strong>. Please enter the code and
            your new password.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmitConfirm(onConfirmSubmit)} className="space-y-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="code" className="font-medium text-gray-700 text-sm">
                Verification Code
              </label>
              <input
                id="code"
                type="text"
                autoComplete="off"
                {...registerConfirm('code', {
                  required: 'Verification code is required',
                })}
                placeholder="Enter verification code"
                className="px-3 py-3 border-2 border-gray-200 rounded-lg text-base text-white bg-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
              />
              {errorsConfirm.code && (
                <span className="text-red-600 text-sm">{errorsConfirm.code.message}</span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="newPassword" className="font-medium text-gray-700 text-sm">
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                {...registerConfirm('newPassword', {
                  required: 'New password is required',
                  minLength: {
                    value: 8,
                    message: 'Password must be at least 8 characters',
                  },
                })}
                placeholder="Enter new password"
                className="px-3 py-3 border-2 border-gray-200 rounded-lg text-base text-white bg-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
              />
              {errorsConfirm.newPassword && (
                <span className="text-red-600 text-sm">{errorsConfirm.newPassword.message}</span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="confirmPassword" className="font-medium text-gray-700 text-sm">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                {...registerConfirm('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: (value) => value === newPassword || 'Passwords do not match',
                })}
                placeholder="Confirm new password"
                className="px-3 py-3 border-2 border-gray-200 rounded-lg text-base text-white bg-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
              />
              {errorsConfirm.confirmPassword && (
                <span className="text-red-600 text-sm">
                  {errorsConfirm.confirmPassword.message}
                </span>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 rounded-lg font-semibold text-base hover:from-purple-600 hover:to-purple-700 transform hover:-translate-y-0.5 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
              disabled={loading}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setStep('request')}
            className="mt-4 w-full text-purple-600 hover:text-purple-700 text-sm font-medium"
          >
            Back to email entry
          </button>

          <p className="mt-6 text-center text-gray-600 text-sm">
            Remember your password?{' '}
            <Link to="/login" className="text-purple-600 hover:text-purple-700 font-semibold">
              Login
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 to-purple-700 p-5">
      <div className="bg-white rounded-xl shadow-2xl p-10 w-full max-w-md">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Reset Password</h1>
        <p className="text-gray-600 mb-8">
          Enter your email address and we'll send you a verification code to reset your password.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmitRequest(onRequestSubmit)} className="space-y-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="font-medium text-gray-700 text-sm">
              Email
            </label>
            <input
              id="email"
              type="email"
              {...registerRequest('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              })}
              placeholder="Enter your email"
              className="px-3 py-3 border-2 border-gray-200 rounded-lg text-base text-white bg-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
            />
            {errorsRequest.email && (
              <span className="text-red-600 text-sm">{errorsRequest.email.message}</span>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 rounded-lg font-semibold text-base hover:from-purple-600 hover:to-purple-700 transform hover:-translate-y-0.5 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Verification Code'}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-600 text-sm">
          Remember your password?{' '}
          <Link to="/login" className="text-purple-600 hover:text-purple-700 font-semibold">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
