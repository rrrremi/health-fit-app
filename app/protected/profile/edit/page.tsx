'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { ArrowLeft, User, Mail, Save, X } from 'lucide-react'
import Link from 'next/link'
import { Profile, Sex } from '@/types/database'
import { toast } from '@/lib/toast'

export default function EditProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [fullName, setFullName] = useState('')
  const [age, setAge] = useState<number | ''>('')
  const [sex, setSex] = useState<Sex | ''>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          router.push('/auth/login')
          return
        }
        
        // Get user profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (profileError) {
          throw profileError
        }
        
        setProfile(profileData as Profile)
        setFullName(profileData?.full_name || '')
        setAge(profileData?.age || '')
        setSex(profileData?.sex || '')
      } catch (err) {
        toast.error('Failed to load profile data')
      } finally {
        setLoading(false)
      }
    }
    
    fetchProfile()
  }, [router, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSaving(true)

    try {
      if (!profile) {
        throw new Error('Profile not found')
      }

      // Update profile in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          full_name: fullName,
          age: age === '' ? null : Number(age),
          sex: sex === '' ? null : sex,
          updated_at: new Date().toISOString() // Add updated_at to trigger real-time subscription
        })
        .eq('id', profile.id)

      if (updateError) {
        throw updateError
      }

      // Update user metadata
      await supabase.auth.updateUser({
        data: { full_name: fullName }
      })

      setSuccess(true)
      toast.success('Profile updated successfully')
      
      // Redirect back to profile after a short delay
      setTimeout(() => {
        router.push('/protected/profile')
        router.refresh()
      }, 1000)
    } catch (err) {
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <svg className="animate-spin h-5 w-5 text-white mx-auto mb-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-xs text-white/70">Loading...</p>
          </div>
        </div>
    )
  }

  return (
    <>
      {/* Main Content */}
      <section className="mx-auto w-full max-w-3xl px-2 pb-10">
        {/* Back button */}
        <div className="mb-2">
          <Link href="/protected/profile">
            <button className="flex items-center gap-1.5 rounded-lg border border-transparent bg-white/5 px-3 py-1.5 text-xs text-white/80 backdrop-blur-xl hover:bg-white/10 transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-3"
        >
          {/* Header */}
          <div className="relative overflow-hidden rounded-lg border border-transparent bg-white/5 p-3 backdrop-blur-2xl">
            <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/10 blur-2xl opacity-50" />
            <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-white/10 blur-2xl opacity-50" />

            <div className="relative">
              <h1 className="text-xl tracking-tight flex items-center gap-2">
                <User className="h-5 w-5 text-fuchsia-400" />
                Edit Profile
              </h1>
              <p className="mt-0.5 text-xs text-white/70">Update your account information</p>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300 backdrop-blur-xl">
              {error}
            </div>
          )}
          
          {success && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300 backdrop-blur-xl">
              Profile updated successfully!
            </div>
          )}

          {/* Form */}
          <div className="rounded-lg border border-transparent bg-white/5 backdrop-blur-xl p-3">
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Email (read-only) */}
              <div>
                <label className="text-xs text-white/70 flex items-center gap-1 mb-1">
                  <Mail className="h-3 w-3" />
                  Email
                </label>
                <div className="rounded-md border border-transparent bg-white/5 px-2.5 py-1.5 text-sm text-white/70">
                  {profile?.email}
                </div>
              </div>
              
              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className="text-xs text-white/70 flex items-center gap-1 mb-1">
                  <User className="h-3 w-3" />
                  Full Name
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-2.5 py-1.5 bg-white/5 border border-transparent rounded-md text-white placeholder:text-white/40 focus:outline-none focus:border-fuchsia-500/50 transition-all duration-200 text-sm"
                />
              </div>

              {/* Age */}
              <div>
                <label htmlFor="age" className="text-xs text-white/70 flex items-center gap-1 mb-1">
                  <User className="h-3 w-3" />
                  Age
                </label>
                <input
                  id="age"
                  name="age"
                  type="number"
                  min="13"
                  max="120"
                  value={age}
                  onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Enter your age"
                  className="w-full px-2.5 py-1.5 bg-white/5 border border-transparent rounded-md text-white placeholder:text-white/40 focus:outline-none focus:border-fuchsia-500/50 transition-all duration-200 text-sm"
                />
                <p className="mt-1 text-[10px] text-white/50">Optional. Used for health analysis.</p>
              </div>

              {/* Sex */}
              <div>
                <label htmlFor="sex" className="text-xs text-white/70 flex items-center gap-1 mb-1">
                  <User className="h-3 w-3" />
                  Sex
                </label>
                <select
                  id="sex"
                  name="sex"
                  value={sex}
                  onChange={(e) => setSex(e.target.value as Sex | '')}
                  className="w-full px-2.5 py-1.5 bg-white/5 border border-transparent rounded-md text-white focus:outline-none focus:border-fuchsia-500/50 transition-all duration-200 text-sm"
                >
                  <option value="" className="bg-gray-900">Not specified</option>
                  <option value="male" className="bg-gray-900">Male</option>
                  <option value="female" className="bg-gray-900">Female</option>
                  <option value="other" className="bg-gray-900">Other</option>
                  <option value="prefer_not_to_say" className="bg-gray-900">Prefer not to say</option>
                </select>
                <p className="mt-1 text-[10px] text-white/50">Optional. Used for health analysis.</p>
              </div>
              
              {/* Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-3 py-1.5 text-xs text-white hover:brightness-110 transition-all disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                
                <Link href="/protected/profile">
                  <button
                    type="button"
                    className="flex items-center gap-1.5 rounded-lg border border-transparent bg-white/10 px-3 py-1.5 text-xs text-white/90 hover:bg-white/20 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </button>
                </Link>
              </div>
            </form>
          </div>
        </motion.div>
      </section>
    </>
  )
}
