'use client'

import { useSession } from 'next-auth/react'
import UserProfile from './UserProfile'

interface AuthenticatedContentProps {
  children: React.ReactNode
}

export default function AuthenticatedContent({ children }: AuthenticatedContentProps) {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-400 via-red-500 to-pink-500 flex items-center justify-center">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-2xl">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Authentication aware header */}
      <div className="absolute top-4 right-4 z-50">
        <UserProfile />
      </div>
      {children}
    </>
  )
}

// Hook to check authentication status
export function useAuth() {
  const { data: session, status } = useSession()
  
  return {
    user: session?.user,
    isLoading: status === 'loading',
    isAuthenticated: !!session
  }
}