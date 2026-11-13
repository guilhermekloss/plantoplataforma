import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { env } from '@/env';

const API_URL = env.NEXT_PUBLIC_API_URL;

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    organizationId: string;
    organizationType: string;
  };
}

/** Lê o claim `exp` (em ms) de um JWT sem verificar a assinatura. */
function readExpiryMs(token: string): number {
  try {
    const part = token.split('.')[1];
    if (!part) return 0;
    const payload = JSON.parse(Buffer.from(part, 'base64url').toString()) as { exp?: number };
    return payload.exp ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

/** Renova os tokens via /auth/refresh quando o access token está prestes a expirar. */
async function refreshTokens(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
} | null> {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    return (await res.json()) as { accessToken: string; refreshToken: string };
  } catch {
    return null;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        const res = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: credentials?.email,
            password: credentials?.password,
          }),
        });
        if (!res.ok) {
          return null;
        }
        const data = (await res.json()) as LoginResponse;
        return {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role,
          organizationId: data.user.organizationId,
          organizationType: data.user.organizationType,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Login inicial: copia os dados do usuário para o token.
      if (user) {
        token.uid = user.id ?? '';
        token.role = user.role;
        token.organizationId = user.organizationId;
        token.organizationType = user.organizationType;
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.accessTokenExpires = readExpiryMs(user.accessToken);
        return token;
      }

      // Access token ainda válido (margem de 60s)? Mantém.
      const expiresAt = token.accessTokenExpires;
      if (typeof expiresAt === 'number' && Date.now() < expiresAt - 60_000) {
        return token;
      }

      // Expirando/expirado: tenta renovar via refresh token.
      const refreshed = await refreshTokens(token.refreshToken);
      if (!refreshed) {
        token.error = 'RefreshAccessTokenError';
        return token;
      }
      token.accessToken = refreshed.accessToken;
      token.refreshToken = refreshed.refreshToken;
      token.accessTokenExpires = readExpiryMs(refreshed.accessToken);
      delete token.error;
      return token;
    },
    session({ session, token }) {
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      session.user.id = token.uid;
      session.user.role = token.role;
      session.user.organizationId = token.organizationId;
      session.user.organizationType = token.organizationType;
      return session;
    },
  },
});
