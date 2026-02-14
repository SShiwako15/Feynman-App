import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';

interface LoginForm {
  emailOrUsername: string;
  password: string;
}

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    setError('');
    try {
      await login(data.emailOrUsername, data.password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid email/username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left: form */}
      <div className="w-full lg:w-1/2 flex flex-col px-8 sm:px-12 lg:px-20 py-10 lg:py-14">
        {/* Brand */}
        <div className="mb-12 flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-purple-600 flex items-center justify-center text-white font-bold text-xl">
            F
          </div>
          <span className="text-lg font-semibold text-gray-900">Feynman App</span>
        </div>

        <div className="max-w-md w-full mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Welcome back</h1>
          <p className="text-gray-500 mb-10 text-sm sm:text-base">
            Please enter your details to sign in.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="emailOrUsername" className="font-medium text-gray-800 text-sm">
                Email address
              </label>
              <input
                id="emailOrUsername"
                type="text"
                {...register('emailOrUsername', {
                  required: 'Email or username is required',
                })}
                placeholder="name@example.com"
                className="px-3 py-3 border border-gray-300 rounded-md text-sm sm:text-base text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-colors"
              />
              {errors.emailOrUsername && (
                <span className="text-red-600 text-xs sm:text-sm">
                  {errors.emailOrUsername.message}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="font-medium text-gray-800 text-sm">
                Password
              </label>
              <input
                id="password"
                type="password"
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 6,
                    message: 'Password must be at least 6 characters',
                  },
                })}
                placeholder="Enter your password"
                className="px-3 py-3 border border-gray-300 rounded-md text-sm sm:text-base text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-colors"
              />
              {errors.password && (
                <span className="text-red-600 text-xs sm:text-sm">{errors.password.message}</span>
              )}
            </div>

            <div className="flex items-center justify-between text-xs sm:text-sm">
              <label className="inline-flex items-center gap-2 text-gray-600">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span>Remember for 30 days</span>
              </label>
              <Link
                to="/reset-password"
                className="text-purple-600 hover:text-purple-700 font-medium"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-md font-semibold text-sm sm:text-base transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="mt-8 text-center text-gray-500 text-sm">
            Don't have an account?{' '}
            <Link to="/register" className="text-purple-600 hover:text-purple-700 font-semibold">
              Sign up
            </Link>
          </p>
        </div>
      </div>

      {/* Right: illustration / accent panel */}
      <div className="hidden lg:flex w-1/2 bg-purple-100 items-center justify-center">
        <div className="max-w-md text-center px-10">
          <div className="w-40 h-40 mx-auto mb-8 rounded-full bg-purple-500/80 flex items-center justify-center text-white text-5xl">
            ✨
          </div>
          <h2 className="text-2xl font-semibold text-purple-900 mb-3">
            Collaborate and learn visually
          </h2>
          <p className="text-purple-900/80 text-sm leading-relaxed">
            Join Feynman App to explain ideas, share concepts, and work through problems together
            in real time.
          </p>
        </div>
      </div>
    </div>
  );
}

