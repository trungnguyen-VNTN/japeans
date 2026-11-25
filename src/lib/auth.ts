import "server-only";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { getServerSession, type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { missingAuthEnv } from "@/lib/auth-config";
import { db } from "@/lib/db";

export const authConfigured = missingAuthEnv(process.env).length === 0;

export const authOptions: NextAuthOptions = {
  // The adapter is typed against @prisma/client; our client is generated to src/generated/prisma
  // with the same model API, so the cast only bridges the two type packages.
  adapter: PrismaAdapter(db as unknown as Parameters<typeof PrismaAdapter>[0]),
  providers: authConfigured
    ? [
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
      ]
    : [],
  session: { strategy: "database", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/dang-nhap", error: "/dang-nhap" },
  callbacks: {
    // Identity for the app comes only from this server-side session (invariant #5).
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = (user as { role?: string }).role ?? "LEARNER";
      }
      return session;
    },
  },
};

export type CurrentUser = { id: string; name: string | null; email: string | null; image: string | null; role: string };

/** The signed-in user, or null. Reads cookies, so call it inside a <Suspense> boundary. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  // next-auth calls crypto.randomBytes before reading cookies; mark this as request-time work
  // so Cache Components does not try to prerender it.
  await connection();
  if (!authConfigured) return null;
  const session = await getServerSession(authOptions);
  const u = session?.user;
  if (!u?.id) return null;
  return { id: u.id, name: u.name ?? null, email: u.email ?? null, image: u.image ?? null, role: u.role };
}

/** Like getCurrentUser, but sends anonymous visitors to the sign-in page and back afterwards. */
export async function requireUser(callbackPath: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/dang-nhap?callbackUrl=${encodeURIComponent(callbackPath)}`);
  return user;
}
