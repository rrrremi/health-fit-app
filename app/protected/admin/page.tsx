'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { Users, Search, Shield, Mail, Calendar, BarChart3, ArrowLeft, RefreshCw, Crown, Scale } from 'lucide-react'

interface User {
  id: string
  email: string
  full_name: string | null
  is_admin: boolean
  created_at: string
  workoutCount: number
}

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [resetEmailStatus, setResetEmailStatus] = useState<{ email: string; status: 'loading' | 'success' | 'error'; message?: string } | null>(null)
  const supabase = createClient()

  // Fetch users from the API endpoint
  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Check if user is admin first
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (!profile?.is_admin) {
        router.push('/protected/workouts')
        return
      }
      
      // Fetch users from API endpoint
      const response = await fetch('/api/admin/users')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch users')
      }
      
      setUsers(data.users || [])
      console.log(`Found ${data.users?.length || 0} users`)
    } catch (err) {
      console.error('Error fetching users:', err)
      setError(err instanceof Error ? err.message : 'Failed to load user data')
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  // Filter users based on search term
  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
  )
  
  // Refresh users list
  const refreshUsers = async () => {
    setIsRefreshing(true)
    await fetchUsers()
  }

  // Send password reset email
  const sendPasswordReset = async (email: string) => {
    try {
      setResetEmailStatus({ email, status: 'loading' })

      const response = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send password reset email')
      }

      setResetEmailStatus({
        email,
        status: 'success',
        message: 'Password reset email sent successfully'
      })

      // Clear success message after 5 seconds
      setTimeout(() => {
        setResetEmailStatus(prev => prev?.email === email ? null : prev)
      }, 5000)
    } catch (error) {
      console.error('Error sending password reset email:', error)
      setResetEmailStatus({
        email,
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to send password reset email'
      })
    }
  }

  // Load users on component mount
  useEffect(() => {
    fetchUsers()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex items-center justify-center">
          <div className="text-center py-6">
            <svg className="animate-spin h-6 w-6 text-white mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-sm text-white/70">Loading admin panel...</p>
          </div>
        </div>
    );
  }

  return (
    <>
      {/* Main Content */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-10 pt-4">
        {/* Back button */}
        <div className="mb-3">
          <Link href="/protected/workouts">
            <button className="flex items-center gap-1.5 rounded-lg border border-transparent bg-white/5 px-3 py-1.5 text-xs text-white/80 backdrop-blur-xl hover:bg-white/10 transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-3"
        >
          {/* Header Section */}
          <div className="relative overflow-hidden rounded-lg border border-transparent bg-white/5 p-4 backdrop-blur-xl">
            <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/10 blur-2xl opacity-50" />
            <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-white/10 blur-2xl opacity-50" />

            <div className="relative">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-semibold tracking-tight">
                    Admin Panel
                  </h1>
                  <p className="mt-0.5 text-xs text-white/70">Manage users and platform operations</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={refreshUsers}
                    disabled={isRefreshing}
                    className={`flex items-center gap-1.5 rounded-lg border border-transparent ${isRefreshing ? 'bg-white/5 text-white/50' : 'bg-white/10 text-white/90 hover:bg-white/15'} px-2 py-1 text-[10px] transition-colors`}
                  >
                    <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                    {isRefreshing ? 'Refreshing...' : 'Refresh Users'}
                  </button>
                  
                  <div className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs">
                    <span className="text-white/90 font-light">Administrator</span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mt-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive backdrop-blur-xl">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid gap-3 md:grid-cols-2">
            <Link href="/protected/admin/metrics">
              <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-xl p-4 hover:bg-white/10 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/20">
                    <Scale className="h-5 w-5 text-emerald-300" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Metrics Catalog</h3>
                    <p className="text-xs text-white/60">Manage measurement types</p>
                  </div>
                </div>
              </div>
            </Link>

            <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-xl p-4 opacity-50 cursor-not-allowed">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/10">
                  <BarChart3 className="h-5 w-5 text-white/60" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white/70">Analytics</h3>
                  <p className="text-xs text-white/50">Coming soon</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-transparent bg-white/5 backdrop-blur-xl p-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-medium text-white/70">Total Users</h3>
                  <p className="text-lg font-bold text-white/90">{users.length}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-transparent bg-white/5 backdrop-blur-xl p-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-medium text-white/70">Total Workouts</h3>
                  <p className="text-lg font-bold text-white/90">{users.reduce((sum, user) => sum + user.workoutCount, 0)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-transparent bg-white/5 backdrop-blur-xl p-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-medium text-white/70">Admins</h3>
                  <p className="text-lg font-bold text-white/90">{users.filter(user => user.is_admin).length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* User Management */}
          <div className="rounded-lg border border-transparent bg-white/5 backdrop-blur-xl">
            <div className="flex items-center justify-between p-3 border-b border-transparent">
              <h3 className="text-xs font-medium text-white/90 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                User Management
              </h3>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3 w-3 text-white/40" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-transparent bg-white/5 text-xs text-white/90 placeholder-white/40 backdrop-blur-xl focus:ring-1 focus:ring-white/20 focus:border-white/20"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-transparent">
                    <th className="text-left p-2 text-[10px] font-medium text-white/70">User</th>
                    <th className="text-left p-2 text-[10px] font-medium text-white/70">Role</th>
                    <th className="text-left p-2 text-[10px] font-medium text-white/70">Joined</th>
                    <th className="text-left p-2 text-[10px] font-medium text-white/70">Workouts</th>
                    <th className="text-left p-2 text-[10px] font-medium text-white/70">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map(user => (
                      <tr key={user.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="p-2">
                          <div>
                            <p className="text-xs font-medium text-white/90">{user.email}</p>
                            <p className="text-[10px] text-white/60">{user.full_name || 'No name set'}</p>
                          </div>
                        </td>
                        <td className="p-2">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                            user.is_admin
                              ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/20'
                              : 'bg-white/10 text-white/70 border border-transparent'
                          }`}>
                            {user.is_admin ? 'Admin' : 'User'}
                          </span>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 text-white/40" />
                            <span className="text-[10px] text-white/80">
                              {new Date(user.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </td>
                        <td className="p-2">
                          <span className="text-xs font-medium text-white/90">{user.workoutCount}</span>
                        </td>
                        <td className="p-2">
                          {resetEmailStatus && resetEmailStatus.email === user.email ? (
                            <div className="flex items-center gap-1.5">
                              {resetEmailStatus.status === 'loading' && (
                                <>
                                  <RefreshCw className="h-3 w-3 animate-spin text-white/60" />
                                  <span className="text-[10px] text-white/60">Sending...</span>
                                </>
                              )}
                              {resetEmailStatus.status === 'success' && (
                                <span className="text-[10px] text-green-400">✓ Email sent</span>
                              )}
                              {resetEmailStatus.status === 'error' && (
                                <span className="text-[10px] text-destructive">✗ Failed</span>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => sendPasswordReset(user.email)}
                              className="flex items-center gap-1.5 rounded-lg border border-transparent bg-white/10 px-2 py-0.5 text-[10px] text-white/90 hover:bg-white/20 transition-colors"
                            >
                              <Mail className="h-2.5 w-2.5" />
                              Reset
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center">
                        <div className="text-white/60">
                          {searchTerm ? 'No users match your search' : 'No users found'}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      </section>
    </>
  )
}
