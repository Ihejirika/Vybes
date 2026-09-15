'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

export default function Navbar() {
    const pathname = usePathname();

    // Hide navbar on dashboard routes so it doesn't clash with the sidebar layout
    if (pathname && pathname.startsWith('/dashboard')) return null;

    return (
        <nav className="sticky top-0 z-50 backdrop-blur-xl bg-black/60 border-b border-white/5">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                <Link href="/" className="flex items-center">
                    <Image src="/logo.png" alt="Vybes Logo" width={110} height={35} className="invert object-contain" priority />
                </Link>
                <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
                    <Link href="/" className="hover:text-white transition">Home</Link>
                    <Link href="/#events" className="hover:text-white transition">Events</Link>
                    <Link href="/#pricing" className="hover:text-white transition">Pricing</Link>
                    <Link href="/#faqs" className="hover:text-white transition">FAQs</Link>
                </div>
                <div className="flex items-center gap-4">
                    <Link href="/login" className="text-xs font-semibold text-zinc-300 hover:text-white px-3 py-2 transition">Log in</Link>
                    <Link href="/login" className="text-xs font-semibold bg-white text-black px-5 py-2.5 rounded-full hover:bg-zinc-200 transition shadow-[0_0_20px_rgba(255,255,255,0.15)]">Get Started</Link>
                </div>
            </div>
        </nav>
    );
}