import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
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
      // GitHub이 2026-04 RFC 9207 롤아웃으로 콜백에 iss 파라미터를 실어 보내기 시작함.
      // provider에 issuer를 명시하지 않으면 Auth.js가 플레이스홀더(authjs.dev)와 비교하다
      // "unexpected iss" 로 콜백이 실패한다. GitHub이 보내는 값과 정확히 일치시킨다.
      issuer: "https://github.com/login/oauth",
    }),
  ],
  callbacks: {
    async jwt({ token, user, profile, account }) {
      if (user?.isAdmin) token.isAdmin = true;
      if (account?.provider === "github") token.githubId = account.providerAccountId;
      if (profile) token.githubUsername = profile.login;
      if (token.githubUsername === process.env.ADMIN_GITHUB_ID) token.isAdmin = true;
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          githubId: token.githubId as string | undefined,
          githubUsername: token.githubUsername as string | undefined,
          isAdmin: token.isAdmin as boolean ?? false,
        },
      };
    },
  },
  pages: {
    signIn: "/admin-login",
  },
});
