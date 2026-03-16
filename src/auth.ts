import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db/prisma";
import { collapseAdminRoles } from "@/lib/auth/roles";
import { decryptMfaSecret, verifyTotpCode } from "@/lib/mfa";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8
  },
  pages: {
    signIn: "/admin/login"
  },
  providers: [
    Credentials({
      name: "Admin credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        mfaCode: { label: "MFA code", type: "text" }
      },
      async authorize(credentials) {
        const email = credentials.email?.toString().toLowerCase();
        const password = credentials.password?.toString();

        if (!email || !password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
          include: { roles: { include: { role: true } } }
        });

        if (!user || !user.passwordHash || !user.activeStatus) {
          return null;
        }

        const roles = collapseAdminRoles(user.roles.map((entry) => entry.role.name));
        if (roles.length === 0) {
          return null;
        }

        const passwordOk = await bcrypt.compare(password, user.passwordHash);
        if (!passwordOk) {
          return null;
        }

        if (user.mfaEnabled) {
          const mfaCode = credentials.mfaCode?.toString() ?? "";
          if (!mfaCode || !user.mfaSecretEncrypted) {
            return null;
          }

          try {
            const secret = decryptMfaSecret(user.mfaSecretEncrypted);
            if (!verifyTotpCode(secret, mfaCode)) {
              return null;
            }
          } catch (error) {
            console.error("[auth] MFA verification failed", error);
            return null;
          }
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() }
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          roles
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.roles = (user as { roles?: string[] }).roles ?? [];
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.roles = (token.roles as string[]) ?? [];
      }
      return session;
    }
  }
});
