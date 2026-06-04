import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { activeTenant } from "@/lib/tenants";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Trust the deployment host (Vercel sets the URL; local dev needs this too).
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login", // surface access-denied etc. on the login page
  },
  callbacks: {
    // Whitelist level 1: only allowed emails may complete sign-in.
    signIn({ user }) {
      const allowed = activeTenant().allowedEmails.map((e) => e.toLowerCase());
      return allowed.includes((user.email ?? "").toLowerCase());
    },
    redirect({ baseUrl }) {
      return `${baseUrl}/sales`;
    },
  },
});
