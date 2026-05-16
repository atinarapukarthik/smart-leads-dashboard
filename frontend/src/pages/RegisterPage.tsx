import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/client';
import Loader from '../components/ui/Loader';
import type { RegisterResponse } from '../types';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type RegisterFormData = z.infer<typeof registerSchema>;

const RegisterPage = () => {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setApiError(null);
    setIsSubmitting(true);
    try {
      await apiClient.post<RegisterResponse>('/auth/register', data);
      navigate('/login', { state: { registrationSuccess: true } });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setApiError(
        error.response?.data?.message || 'Registration failed. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitting) {
    return <Loader />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-6 text-center text-2xl font-bold text-gray-900">
          Create Account
        </h1>

        {apiError && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label
              htmlFor="register-name"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Name
            </label>
            <input
              id="register-name"
              type="text"
              {...register('name')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="John Doe"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="register-email"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              id="register-email"
              type="email"
              {...register('email')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="you@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="register-password"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              id="register-password"
              type="password"
              {...register('password')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-blue-600 hover:text-blue-700">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
