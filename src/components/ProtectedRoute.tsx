'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, ReactNode } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return // Still loading
    
    if (!session) {
      router.push('/auth/signin')
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-white rounded-lg p-2 mx-auto mb-4 shadow-lg">
            <img 
              src="/web-app-manifest-192x192.png" 
              alt="B4OS Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-300 rounded w-32 mx-auto mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-24 mx-auto"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return null // Will redirect to login
  }

  return <>{children}</>
}