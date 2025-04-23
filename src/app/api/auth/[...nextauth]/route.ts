import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import PocketBase from "pocketbase";

export const authOptions: AuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password");
        }

        const pb = new PocketBase(
          process.env.POCKETBASE_URL || "http://127.0.0.1:8090",
        );

        console.log(process.env.POCKETBASE_URL, "Logging in ...");

        try {
          const authData = await pb
            .collection("users")
            .authWithPassword(credentials.email, credentials.password);

          console.log(authData);

          return {
            id: authData.record.id,
            email: authData.record.email,
            token: authData.token,
          };
        } catch (err) {
          throw new Error(`Invalid email or password, ${err}`);
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.pbToken = user.token;
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user = {
          id: token.id as string,
          email: token.email as string,
        };
        session.pbToken = token.pbToken as string;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
