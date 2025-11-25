'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AuthForm from '@/components/auth/AuthForm'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { User, Mail, Lock, UserPlus } from 'lucide-react'
import { toast } from '@/lib/toast'

export default function SignUp() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      if (data.session) {
        toast.success('Account created successfully!')
        // Successfully signed up and logged in, redirect
        router.push('/protected/workouts')
        router.refresh()
      } else {
        // Email confirmation required
        toast.info('Please check your email to confirm your account')
        setLoading(false)
      }
    } catch (err) {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <AuthForm
      title="Create Account"
      description="Sign up to get started"
      error={error}
      onSubmit={handleSignUp}
      footer={
        <div className="text-center mt-2">
          <p className="text-xs text-white/60">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-white/90 font-light hover:text-white transition-colors underline">
              Sign in
            </Link>
          </p>
        </div>
      }
    >
      <div className="space-y-3">
        <Input
          id="fullName"
          name="fullName"
          type="text"
          label="Full Name"
          placeholder="John Doe"
          autoComplete="name"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          icon={<User size={14} />}
        />

        <Input
          id="email"
          name="email"
          type="email"
          label="Email"
          placeholder="your.email@example.com"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          icon={<Mail size={14} />}
        />

        <Input
          id="password"
          name="password"
          type="password"
          label="Password"
          placeholder="••••••••"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          icon={<Lock size={14} />}
          minLength={6}
        />
        <p className="text-xs text-white/60 -mt-1 ml-1">Password must be at least 6 characters</p>

        <Button
          type="submit"
          isLoading={loading}
          variant="primary"
          fullWidth
          leftIcon={<UserPlus size={14} />}
          className="mt-1 py-1.5"
          size="sm"
        >
          {loading ? 'Creating account...' : 'Create account'}
        </Button>
      </div>
    </AuthForm>
  )
}
