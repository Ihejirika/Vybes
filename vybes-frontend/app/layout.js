import './globals.css';
import Navbar from './components/navbar';
import Footer from './components/footer';

export const metadata = {
  title: 'Vybes | Ticketing Redefined',
  description: 'High-concurrency event ticketing platform.',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#050505] text-white selection:bg-purple-500/30 min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-grow">
          {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}
