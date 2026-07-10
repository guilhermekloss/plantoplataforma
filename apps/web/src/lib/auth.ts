import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: credentials?.email, password: credentials?.password }),
        });
        if (!res.ok) return null;

        const data: {
          accessToken: string;
          user: {
            id: string;
            name: string;
            email: string;
            role: string;
            organizationId: string;
            organizationName: string;
            organizationType: string;
          };
        } = await res.json();

        return {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role,
          organizationId: data.user.organizationId,
          organizationName: data.user.organizationName,
          organizationType: data.user.organizationType,
          accessToken: data.accessToken,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.accessToken = user.accessToken;
        token.role = user.role;
        token.organizationId = user.organizationId;
        token.organizationName = user.organizationName;
        token.organizationType = user.organizationType;
      }
      return token;
    },
    session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.user.id = token.sub as string;
      session.user.role = token.role as string;
      session.user.organizationId = token.organizationId as string;
      session.user.organizationName = token.organizationName as string;
      session.user.organizationType = token.organizationType as string;
      return session;
    },
  },
});
