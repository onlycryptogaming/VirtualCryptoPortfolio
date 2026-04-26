import { SessionProvider } from './SessionProvider';

export const metadata = { title: 'CryptoClassroom', description: 'Virtual Crypto Trading Simulator' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
