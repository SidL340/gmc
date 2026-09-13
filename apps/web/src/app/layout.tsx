import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import QueryProvider from '@/components/providers/QueryProvider';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import ChatBot from '@/components/chatbot/ChatBot';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'GM Collection House | Women\'s Clothing Store Nepal',
  description: 'Shop the finest Kurta sets, Sarees, Lehengas, and Western clothing in Nepal. Fast delivery with NepalCanMove, COD, FonePay, and NepalPay available.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="overflow-x-hidden">
      <body className={`${inter.variable} font-sans min-h-screen flex flex-col overflow-x-hidden`}>
        <QueryProvider>
          <Navbar />
          <main className="flex-1 pb-24 md:pb-0">{children}</main>
          <Footer />
          <MobileBottomNav />
          <ChatBot />
          <Toaster
            position="bottom-center"
            toastOptions={{
              duration: 3500,
              style: {
                background: '#1a1a2e',
                color: '#fff',
                borderRadius: '12px',
                fontSize: '13px',
              },
              success: {
                iconTheme: {
                  primary: '#C9184A',
                  secondary: '#fff',
                },
              },
            }}
          />
        </QueryProvider>
      </body>
    </html>
  );
}
