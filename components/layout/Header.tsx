'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dumbbell,
  User,
  BarChart3,
  Shield,
  Menu,
  X,
  Sparkles,
  Settings,
  LogOut,
  Home,
  Target,
  Scale
} from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, signOut, loading: authLoading } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  // Update admin status when user changes
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        try {
          const supabase = (await import('@/lib/supabase/client')).createClient()
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single()
          
          setIsAdmin(profile?.is_admin || false)
        } catch (error) {
          console.error('Error checking admin status:', error)
          setIsAdmin(false)
        }
      } else {
        setIsAdmin(false)
      }
    }
    
    checkAdminStatus()
  }, [user])

  const handleSignOut = async () => {
    await signOut()
    setIsMenuOpen(false)
  }

  // Check if we're on an auth page
  const isLoginPage = pathname?.startsWith('/auth/login')
  const isSignUpPage = pathname?.startsWith('/auth/signup')
  const isAuthPage = isLoginPage || isSignUpPage
  
  const navigationItems = [
    // Removed Home button
    // Removed Dashboard button
    // Profile moved to right side (icon only)
    { href: '/protected/workouts', label: 'Workouts', icon: Dumbbell, requiresAuth: true, showAlways: false, hideWhenAuth: false, requiresAdmin: false },
    { href: '/protected/measurements', label: 'Measurements', icon: Scale, requiresAuth: true, showAlways: false, hideWhenAuth: false, requiresAdmin: false },
    // Removed Admin button
  ]

  const filteredNavItems = navigationItems.filter(item =>
    // Hide Home button on auth pages
    !(isAuthPage && item.href === '/') &&
    (!item.requiresAuth || user) &&
    (!item.requiresAdmin || isAdmin) &&
    (item.showAlways || (user && !item.hideWhenAuth) || (!user && !item.requiresAuth))
  )

  const isActiveLink = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname?.startsWith(href)
  }

  // Debug user state with more details
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Auth state:', {
        user: user ? { id: user.id, email: user.email } : null,
        isAdmin,
        isLoggedIn: !!user,
        pathname
      })
    }
  }, [user, isAdmin, pathname])

  return (
    <header className="sticky top-0 z-50 w-full border-b border-transparent bg-transparent backdrop-blur-2xl safe-area-top">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 rounded-lg p-2 outline-none focus:outline-none">
            <Dumbbell className="h-5 w-5 text-white/90" strokeWidth={1.5} />
            <span className="hidden font-light text-lg text-white/90 tracking-wide sm:block">
              heal
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            {filteredNavItems.map((item) => {
              const Icon = item.icon
              const isActive = isActiveLink(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-light transition-all duration-300 ${
                    isActive
                      ? 'bg-white/10 text-white/90'
                      : 'bg-transparent text-white/50 hover:bg-white/5 hover:text-white/80'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Right side - Auth/User Actions */}
          <div className="flex items-center gap-2">
            {/* Show nothing while auth is loading to prevent flash */}
            {authLoading ? (
              <div className="w-20 h-8" /> 
            ) : (user && user.id) ? (
              <>
                {/* User Menu - Desktop */}
                <div className="hidden md:flex items-center gap-2">
                  {isAdmin && (
                    <Link
                      href="/protected/admin"
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-light transition-all duration-300 ${
                        isActiveLink('/protected/admin')
                          ? 'bg-white/10 text-white/90'
                          : 'bg-transparent text-white/50 hover:bg-white/5 hover:text-white/80'
                      }`}
                    >
                      <Shield className="h-3.5 w-3.5" />
                      Admin
                    </Link>
                  )}
                  <Link
                    href="/protected/profile"
                    className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-300 ${
                      isActiveLink('/protected/profile')
                        ? 'bg-white/10 text-white/90'
                        : 'bg-transparent text-white/50 hover:bg-white/5 hover:text-white/80'
                    }`}
                    aria-label="Profile"
                  >
                    <User className="h-3.5 w-3.5" />
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-light bg-transparent text-white/50 hover:bg-white/5 hover:text-white/80 transition-all duration-300"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign Out
                  </button>
                </div>

                {/* Mobile Menu Button */}
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg bg-transparent text-white/50 hover:bg-white/5 hover:text-white/80 transition-all duration-300"
                  aria-label="Toggle menu"
                >
                  {isMenuOpen ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <Menu className="h-4 w-4" />
                  )}
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/login"
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-light bg-transparent text-white/50 hover:bg-white/5 hover:text-white/80 transition-all duration-300"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-light bg-transparent text-white/50 hover:bg-white/5 hover:text-white/80 transition-all duration-300"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <AnimatePresence>
          {isMenuOpen && user && (
            <motion.nav
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-transparent bg-transparent backdrop-blur-2xl overflow-hidden"
            >
              <div className="px-4 py-4 space-y-1.5">
                {/* Navigation Links */}
                {filteredNavItems.map((item) => {
                  const Icon = item.icon
                  const isActive = isActiveLink(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-light transition-all duration-300 ${
                        isActive
                          ? 'bg-white/10 text-white/90'
                          : 'bg-transparent text-white/50 hover:bg-white/5 hover:text-white/80'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {item.label}
                    </Link>
                  )
                })}

                {/* Profile Button */}
                <Link
                  href="/protected/profile"
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-light transition-all duration-300 ${
                    isActiveLink('/protected/profile')
                      ? 'bg-white/10 text-white/90'
                      : 'bg-transparent text-white/50 hover:bg-white/5 hover:text-white/80'
                  }`}
                >
                  <User className="h-3.5 w-3.5" />
                  Profile
                </Link>

                {/* Admin Button */}
                {isAdmin && (
                  <Link
                    href="/protected/admin"
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-light transition-all duration-300 ${
                      isActiveLink('/protected/admin')
                        ? 'bg-white/10 text-white/90'
                        : 'bg-transparent text-white/50 hover:bg-white/5 hover:text-white/80'
                    }`}
                  >
                    <Shield className="h-3.5 w-3.5" />
                    Admin
                  </Link>
                )}

                {/* Sign Out */}
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-xs font-light bg-transparent text-white/50 hover:bg-white/5 hover:text-white/80 transition-all duration-300"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </button>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}
