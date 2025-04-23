import NextAuth, { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface User {
    /** The user's PocketBase token. */
    token?: string;
  }

  interface JWT {
    id?: string;
    email?: string;
    pbToken?: string;
  }

  interface Session {
    user?: {
      id?: string;
      email?: string;
    };
    pbToken?: string;
  }
}
