import GoogleProvider from 'next-auth/providers/google';

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Only allow southfayette.org emails + teacher email
      const email = user.email?.toLowerCase() || '';
      const allowed =
        email.endsWith('@southfayette.org') ||
        email === process.env.TEACHER_EMAIL?.toLowerCase();
      return allowed;
    },
    async session({ session }) {
      return session;
    },
  },
  pages: {
    signIn: '/',
  },
};
