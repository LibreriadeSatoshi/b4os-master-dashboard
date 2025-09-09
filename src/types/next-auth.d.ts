// NextAuth type definitions

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      githubId?: string
      username?: string
    }
    accessToken?: string
  }

  interface User {
    githubId?: string
    username?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    githubId?: string
    username?: string
    accessToken?: string
  }
}
