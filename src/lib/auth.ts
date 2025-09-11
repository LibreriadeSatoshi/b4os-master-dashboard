import GithubProvider from 'next-auth/providers/github'

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error: (code: any, metadata: any) => {
      console.error('NextAuth Error:', code, metadata)
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    warn: (code: any) => {
      console.warn('NextAuth Warning:', code)
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    debug: (code: any, metadata: any) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('NextAuth Debug:', code, metadata)
      }
    }
  },
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async jwt({ token, account, profile }: any) {
      // Persist the OAuth access_token and user info to the token right after signin
      if (account) {
        token.accessToken = account.access_token
        token.githubId = (profile as { id?: string })?.id
        token.username = (profile as { login?: string })?.login
      }
      return token
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, token }: any) {
      // Send properties to the client
      if (session.user) {
        session.user.githubId = token.githubId
        session.user.username = token.username
        session.accessToken = token.accessToken
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
