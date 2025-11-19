'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Dumbbell } from 'lucide-react'

interface AuthFormProps {
  title: string
  description?: string
  footer?: React.ReactNode
  children: React.ReactNode
  onSubmit?: (e: React.FormEvent) => void
  error?: string | null
}

export default function AuthForm({
  title,
  description,
  footer,
  children,
  onSubmit,
  error
}: AuthFormProps) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="rounded-lg border border-transparent bg-white/5 backdrop-blur-xl p-8">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-light text-white/90">{title}</h1>
              {description && <p className="mt-2 text-xs text-white/60">{description}</p>}
            </div>

            {onSubmit ? (
              <form className="space-y-4" onSubmit={onSubmit}>
                <div className="space-y-3">
                  {children}
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-md border border-destructive/20 bg-destructive/10 p-2 text-xs text-destructive font-light"
                  >
                    {error}
                  </motion.div>
                )}

                {footer && <div className="mt-4">{footer}</div>}
              </form>
            ) : (
              <div className="space-y-4">
                <div className="space-y-3">
                  {children}
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-md border border-destructive/20 bg-destructive/10 p-2 text-xs text-destructive font-light"
                  >
                    {error}
                  </motion.div>
                )}

                {footer && <div className="mt-4">{footer}</div>}
              </div>
            )}
          </div>

        </motion.div>
    </div>
  )
}
