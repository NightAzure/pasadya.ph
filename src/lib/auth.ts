import NextAuth from "next-auth";
import Facebook from "next-auth/providers/facebook";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { DrizzleAdapter } from "@auth/drizzle-adapter";

import { db } from "@/db/client";
import {
  accounts,
  authenticators,
  sessions,
  users,
  verificationTokens,
} from "@/db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
    authenticatorsTable: authenticators,
  }),
  session: {
    strategy: "database",
  },
  secret:
    process.env.AUTH_SECRET ??
    (process.env.NODE_ENV === "production"
      ? undefined
      : "development-only-auth-secret-change-before-production"),
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY ?? "replace-with-resend-api-key",
      from: process.env.AUTH_EMAIL_FROM ?? "Pasadya <noreply@pasadya.ph>",
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID ?? "replace-with-google-client-id",
      clientSecret:
        process.env.AUTH_GOOGLE_SECRET ?? "replace-with-google-client-secret",
    }),
    Facebook({
      clientId:
        process.env.AUTH_FACEBOOK_ID ?? "replace-with-facebook-client-id",
      clientSecret:
        process.env.AUTH_FACEBOOK_SECRET ??
        "replace-with-facebook-client-secret",
    }),
  ],
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = user.role;
      }

      return session;
    },
  },
});
