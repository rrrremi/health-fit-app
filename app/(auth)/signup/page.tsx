'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';

export default function Signup() {
  const { signUp, loading: authLoading } = useAuth()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // Basic validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    
    try {
      const { error } = await signUp(formData.email, formData.password, {
        name: formData.name,
        email: formData.email
      });

      if (error) {
        setError(error.message);
        toast.error('Signup failed', { description: error.message });
      } else {
        toast.success('Account created!', {
          description: 'Please check your email to confirm your account.'
        });
        // AuthProvider will handle the redirect automatically after email confirmation
      }
    } catch (err: any) {
      setError('Failed to create account. Please try again.');
      toast.error('Signup failed', { description: 'Please try again.' });
      console.error('Signup error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 border border-transparent bg-white/5 backdrop-blur-xl p-8 rounded-lg">
        <div className="text-center">
          <h1 className="text-2xl font-light text-white/90">Create your account</h1>
          <p className="mt-2 text-xs text-white/60">
            Start your fitness journey with FitGen
          </p>
        </div>
        
        {error && (
          <div className="p-2 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs font-light">
            {error}
          </div>
        )}
        
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-3">
            <div>
              <label htmlFor="name" className="block text-xs font-light text-white/70 mb-1.5">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border border-white/20 bg-white/10 text-white/90 placeholder-white/30 font-light text-sm focus:border-white/30 focus:outline-none backdrop-blur-xl transition-colors"
                placeholder="John Doe"
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-xs font-light text-white/70 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border border-white/20 bg-white/10 text-white/90 placeholder-white/30 font-light text-sm focus:border-white/30 focus:outline-none backdrop-blur-xl transition-colors"
                placeholder="you@example.com"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-xs font-light text-white/70 mb-1.5">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border border-white/20 bg-white/10 text-white/90 placeholder-white/30 font-light text-sm focus:border-white/30 focus:outline-none backdrop-blur-xl transition-colors"
                placeholder="••••••••"
                minLength={8}
              />
              <p className="mt-1 text-xs text-white/40 font-light">Must be at least 8 characters</p>
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-light text-white/70 mb-1.5">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border border-white/20 bg-white/10 text-white/90 placeholder-white/30 font-light text-sm focus:border-white/30 focus:outline-none backdrop-blur-xl transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>
          
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-light text-white/90 hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </div>
        </form>
        
        <div className="mt-4 text-center space-y-3">
          <p className="text-xs text-white/60">
            Already have an account?{' '}
            <Link href="/login" className="font-light text-white/90 hover:text-white transition-colors underline">
              Sign in
            </Link>
          </p>
          
          <p className="text-xs text-white/40 font-light">
            For demo purposes, you can use any information to create an account
          </p>
        </div>
      </div>
    </div>
  );
}
