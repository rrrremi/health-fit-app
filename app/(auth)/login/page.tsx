'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthProvider'
import { toast } from 'sonner'

export default function Login() {
  const { signIn, loading: authLoading } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error } = await signIn(formData.email, formData.password)

      if (error) {
        setError(error.message)
        toast.error('Login failed', { description: error.message })
      } else {
        toast.success('Welcome back!', { description: 'You have been logged in successfully.' })
        // AuthProvider will handle the redirect automatically
      }
    } catch (err: any) {
      setError('An unexpected error occurred')
      toast.error('Login failed', { description: 'Please try again.' })
      console.error('Login error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 border border-transparent bg-white/5 backdrop-blur-xl p-8 rounded-lg">
        <div className="text-center">
          <h1 className="text-2xl font-light text-white/90">Sign In</h1>
          <p className="mt-2 text-xs text-white/60">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-light text-white/90 hover:text-white transition-colors underline">
              Sign up
            </Link>
          </p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleLogin}>
          <div className="space-y-3">
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
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border border-white/20 bg-white/10 text-white/90 placeholder-white/30 font-light text-sm focus:border-white/30 focus:outline-none backdrop-blur-xl transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div className="p-2 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs font-light">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between">
            <Link href="/reset-password" className="text-xs text-white/60 hover:text-white/90 transition-colors font-light">
              Forgot your password?
            </Link>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-light text-white/90 hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
