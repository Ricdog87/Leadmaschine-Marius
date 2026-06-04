import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { activeTenant } from "@/lib/tenants";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Trust the deployment host (Vercel sets the URL; local dev needs this too).
  trustHost: true,
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM,
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login", // surface access-denied etc. on the login page
    verifyRequest: "/login?sent=1",
  },
  callbacks: {
    // Whitelist level 1: only allowed emails may complete sign-in.
    signIn({ user }) {
      const allowed = activeTenant().allowedEmails;
      return allowed.includes(user.email?.toLowerCase() ?? "");
    },
    redirect({ baseUrl }) {
      return `${baseUrl}/sales`;
    },
  },
});
