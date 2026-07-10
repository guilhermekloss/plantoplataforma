import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: string;
    organizationId: string;
    organizationName: string;
    organizationType: string;
    accessToken: string;
  }

  interface Session {
    accessToken: string;
    user: {
      id: string;
      role: string;
      organizationId: string;
      organizationName: string;
      organizationType: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken: string;
    role: string;
    organizationId: string;
    organizationName: string;
    organizationType: string;
  }
}
