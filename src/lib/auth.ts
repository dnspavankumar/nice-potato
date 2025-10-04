import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { config } from './config';

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    refreshToken?: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: config.gmail.clientId,
      clientSecret: config.gmail.clientSecret,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/gmail.readonly',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Store the access token and refresh token
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        console.log('JWT callback - stored tokens:', {
          accessToken: !!token.accessToken,
          refreshToken: !!token.refreshToken
        });
      }
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client
      session.accessToken = token.accessToken as string;
      session.refreshToken = token.refreshToken as string;
      console.log('Session callback - sending tokens:', {
        accessToken: !!session.accessToken,
        refreshToken: !!session.refreshToken
      });
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
};
