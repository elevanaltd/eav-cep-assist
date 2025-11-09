/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { UserProfile } from '../types'
import { Logger } from '../services/logger'

interface User {
  id: string
  email?: string
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  isLoading: boolean
  isError: boolean
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const queryClient = useQueryClient()

  // Get current user session
  useEffect(() => {
    const getSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        const sessionUser = data.session?.user
        if (sessionUser) {
          setUser({ id: sessionUser.id, email: sessionUser.email })
        } else {
          setUser(null)
        }
      } catch (err) {
        Logger.error('Failed to get session', { error: String(err) })
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user
      if (sessionUser) {
        setUser({ id: sessionUser.id, email: sessionUser.email })
      } else {
        setUser(null)
      }
      // Clear cache on auth state change
      queryClient.clear()
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [queryClient])

  // Load user profile
  const {
    data: profile,
    isLoading: profileLoading,
    isError
  } = useQuery<UserProfile | null>({
    queryKey: ['user', user?.id],
    queryFn: async () => {
      if (!user?.id) return null

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (error) throw error
      return data as UserProfile | null
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000 // 5 minutes
  })

  const logout = async () => {
    try {
      await supabase.auth.signOut()
      queryClient.clear()
      setUser(null)
    } catch (err) {
      Logger.error('Failed to logout', { error: String(err) })
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile: profile || null,
        isLoading: isLoading || profileLoading,
        isError,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
