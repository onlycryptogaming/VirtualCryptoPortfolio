import GoogleProvider from "next-auth/providers/google";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.toLowerCase() || "";
      return (
        email.endsWith("@southfayette.org") ||
        email === "rnreasey@southfayette.org"
      );
    },
    async session({ session }) {
      return session;
    },
  },
  pages: { signIn: "/" },
};
