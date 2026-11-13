import type { DefaultSession } from 'next-auth';
// Import necessário para que o `declare module` abaixo AUGMENTE o módulo
// (sem ele, o TypeScript ignora a extensão do JWT).
import type {} from 'next-auth/jwt';

/** Campos extras carregados no token/sessão a partir do login na API NestJS. */
declare module 'next-auth' {
  interface Session {
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      role: string;
      organizationId: string;
      organizationType: string;
    } & DefaultSession['user'];
  }

  interface User {
    id?: string;
    role: string;
    organizationId: string;
    organizationType: string;
    accessToken: string;
    refreshToken: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken: string;
    refreshToken: string;
    role: string;
    organizationId: string;
    organizationType: string;
    uid: string;
    /** Expiração do access token da API em ms (claim `exp` × 1000). */
    accessTokenExpires: number;
    /** Sinaliza falha na renovação — a UI deve forçar novo login. */
    error?: 'RefreshAccessTokenError';
  }
}
