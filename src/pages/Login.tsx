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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 to-purple-700 p-5">
      <div className="bg-white rounded-xl shadow-2xl p-10 w-full max-w-md">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Login</h1>
        <p className="text-gray-600 mb-8">Welcome back! Please login to your account.</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="emailOrUsername" className="font-medium text-gray-700 text-sm">
              Email or Username
            </label>
            <input
              id="emailOrUsername"
              type="text"
              {...register('emailOrUsername', {
                required: 'Email or username is required',
              })}
              placeholder="Enter your email or username"
              className="px-3 py-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-purple-500 transition-colors"
            />
            {errors.emailOrUsername && (
              <span className="text-red-600 text-sm">{errors.emailOrUsername.message}</span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="font-medium text-gray-700 text-sm">
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
              className="px-3 py-3 border-2 border-gray-200 rounded-lg text-base focus:outline-none focus:border-purple-500 transition-colors"
            />
            {errors.password && (
              <span className="text-red-600 text-sm">{errors.password.message}</span>
            )}
          </div>

          <div className="flex justify-end">
            <Link
              to="/reset-password"
              className="text-purple-600 hover:text-purple-700 text-sm font-medium"
            >
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 rounded-lg font-semibold text-base hover:from-purple-600 hover:to-purple-700 transform hover:-translate-y-0.5 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-600 text-sm">
          Don't have an account?{' '}
          <Link to="/register" className="text-purple-600 hover:text-purple-700 font-semibold">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

