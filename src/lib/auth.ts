import GithubProvider from 'next-auth/providers/github'
import { AuthorizationService } from './authorization'
import { type UserRole } from '@/types/common'
import { logger } from '@/lib/logger'

// Helper function to check if user is the initial admin (development bypass)
function isInitialAdmin(username: string): boolean {
  return process.env.NODE_ENV === 'development' && username === process.env.INITIAL_ADMIN_USERNAME
}

// Helper function to handle admin bypass in development
function handleAdminDevBypass(username: string): boolean {
  if (isInitialAdmin(username)) {
    logger.info(`Development bypass: Admin user ${username} allowed`)
    return true
  }
  return false
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function validateAndSetTokenRole(
  token: any,
  githubId: number,
  username: string,
  isRevalidation: boolean = false
): Promise<void> {
  const authResult = await AuthorizationService.checkUserAuthorization(githubId)

  if (!authResult.isAuthorized) {
    if (isRevalidation) {
      logger.warn(`User ${username} authorization revoked`)
    } else {
      logger.warn(`Unauthorized access attempt by GitHub user: ${username} (ID: ${githubId})`)
    }
    throw new Error('Usuario no autorizado')
  }

  token.role = authResult.role as UserRole
  token.isAuthorized = true
  token.lastValidated = Date.now()

  if (process.env.NODE_ENV === 'development') {
    const action = isRevalidation ? 'revalidated' : 'authorized with role'
    logger.info(`User ${username} ${action}: ${token.role}`)
  }
}

// Helper function to check if token needs revalidation
function needsRevalidation(lastValidated: number): boolean {
  const fiveMinutes = 5 * 60 * 1000
  return Date.now() - lastValidated > fiveMinutes
}

// Helper function to check user authorization
async function checkAuthorization(githubId: number, username: string): Promise<boolean> {
  const authResult = await AuthorizationService.checkUserAuthorization(githubId)

  if (!authResult.isAuthorized) {
    logger.warn('❌ AUTHORIZATION FAILED', {
      username,
      githubId,
      reason: authResult.error || 'User not in authorized_users table or status != active'
    })
    return false
  }

  if (process.env.NODE_ENV === 'development') {
    logger.info('✅ AUTHORIZATION SUCCESS', {
      username,
      githubId,
      role: authResult.role
    })
  }
  return true
}

export const authOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID || '',
      clientSecret: process.env.GITHUB_SECRET || '',
    }),
  ],
  // Configuración para producción
  debug: process.env.NODE_ENV === 'development',
  logger: {
    error: (code: any, metadata: any) => {
      logger.error('NextAuth Error', { code, metadata })
    },
    warn: (code: any) => {
      logger.warn('NextAuth Warning', { code })
    },
    debug: (code: any, metadata: any) => {
      logger.debug('NextAuth Debug', { code, metadata })
    }
  },
  callbacks: {
    async signIn({ account, profile }: any) {
      // Solo verificar para GitHub OAuth
      if (account.provider !== 'github') {
        return true
      }

      const username = profile.login
      const githubId = Number.parseInt(profile.id || '0')

      // Bypass para admin en desarrollo
      if (handleAdminDevBypass(username)) {
        return true
      }

      try {
        // Solo log en desarrollo
        if (process.env.NODE_ENV === 'development') {
          logger.info('🔍 Checking authorization in database...', { githubId, username })
        }

        return await checkAuthorization(githubId, username)
      } catch (error) {
        logger.error('💥 EXCEPTION in signIn callback:', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          username,
          githubId: profile.id
        })

        // Bypass para admin en desarrollo si hay error de DB
        if (handleAdminDevBypass(username)) {
          return true
        }
        return false
      }
    },
    async jwt({ token, account, profile }: any) {
      // Initial sign in - account is present
      if (account) {
        token.accessToken = account.access_token
        token.githubId = (profile as { id?: string })?.id
        token.username = (profile as { login?: string })?.login

        const githubId = Number.parseInt((profile as { id?: string })?.id || '0')

        try {
          await validateAndSetTokenRole(token, githubId, token.username)
        } catch (error) {
          logger.error('Error checking user authorization', error)
          throw new Error('Usuario no autorizado para acceder al sistema')
        }
      } else {
        // Subsequent requests - check if revalidation is needed
        const lastValidated = token.lastValidated as number || 0

        if (needsRevalidation(lastValidated)) {
          const githubId = Number.parseInt(token.githubId as string || '0')

          try {
            await validateAndSetTokenRole(token, githubId, token.username, true)
          } catch (error) {
            logger.error('Error revalidating user authorization', error)
            throw new Error('Usuario no autorizado para acceder al sistema')
          }
        }
      }
      return token
    },
    async session({ session, token }: any) {
      // Send properties to the client
      // NOTE: accessToken is NOT sent to client for security reasons
      // It remains only in the server-side JWT token
      if (session.user) {
        session.user.githubId = token.githubId
        session.user.username = token.username
        session.user.role = token.role as UserRole
        session.user.isAuthorized = token.isAuthorized
        // accessToken is intentionally NOT included here - it stays server-side only
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt' as const,
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },
  // Configuración de cookies 
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' 
        ? `__Secure-next-auth.session-token`
        : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax' as const,
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  },
}
