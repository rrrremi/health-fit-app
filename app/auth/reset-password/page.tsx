'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AuthForm from '@/components/auth/AuthForm'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { toast } from '@/lib/toast'

export default function ResetPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/update-password`,
      })

      if (error) {
        setError(error.message)
        return
      }

      setSuccess(true)
      toast.success('Password reset email sent')
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthForm
      title="Reset Password"
      description="Enter your email address and we'll send you a link to reset your password."
      error={error}
      footer={
        <div className="text-center">
          <Link href="/auth/login" className="text-sm hover:underline">
            Back to login
          </Link>
        </div>
      }
    >
      {success ? (
        <div className="space-y-6">
          <div className="text-center p-4 border border-black rounded-md bg-gray-50">
            <p>Check your email for a link to reset your password.</p>
            <p className="mt-4">
              <Link href="/auth/login" className="font-medium hover:underline">
                Back to login
              </Link>
            </p>
          </div>
        </div>
      ) : (
        <form className="space-y-6" onSubmit={handleResetPassword}>
          <Input
            id="email"
            name="email"
            type="email"
            label="Email address"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Button
            type="submit"
            disabled={loading}
            variant="primary"
            fullWidth
          >
            {loading ? 'Sending...' : 'Send reset link'}
          </Button>
        </form>
      )}
    </AuthForm>
  )
}
