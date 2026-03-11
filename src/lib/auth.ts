import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        id: { label: "ID", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const adminId = process.env.ADMIN_ID;
        const adminPw = process.env.ADMIN_PASSWORD;
        if (!adminId || !adminPw) return null;
        if (credentials?.id === adminId && credentials?.password === adminPw) {
          return { id: "admin", name: adminId, isAdmin: true };
        }
        return null;
      },
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async jwt({ token, user, profile }) {
      if (user?.isAdmin) token.isAdmin = true;
      if (profile) token.githubUsername = profile.login;
      if (token.githubUsername === process.env.ADMIN_GITHUB_ID) token.isAdmin = true;
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          githubUsername: token.githubUsername as string | undefined,
          isAdmin: token.isAdmin as boolean ?? false,
        },
      };
    },
  },
  pages: {
    signIn: "/admin/login",
  },
});
