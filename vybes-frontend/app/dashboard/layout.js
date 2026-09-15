'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useEffect, useState } from 'react';

// Inline Icon Helper (Keep your existing icons here)
const Icon = ({ name, className = "w-5 h-5" }) => {
    const icons = {
        grid: <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
        calendar: <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
        wallet: <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>,
        settings: <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
        support: <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
        logout: <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
    };
    return icons[name] || null;
};

export default function DashboardLayout({ children }) {
    const pathname = usePathname();
    const router = useRouter();
    const [greeting, setGreeting] = useState('Good day');
    const [userName, setUserName] = useState('');

    useEffect(() => {
        // Set Greeting
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good morning');
        else if (hour < 18) setGreeting('Good afternoon');
        else setGreeting('Good evening');

        // Extract First Name from LocalStorage
        const fullName = localStorage.getItem('vybes_user_name') || 'Creator';
        const firstName = fullName.split(' ')[0];
        setUserName(firstName);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('vybes_token');
        localStorage.removeItem('vybes_user_name');
        router.push('/login');
    };

    const navLinks = [
        { name: 'Dashboard', href: '/dashboard', icon: 'grid' },
        { name: 'Events', href: '/dashboard/events', icon: 'calendar' },
        { name: 'Wallet', href: '/dashboard/wallet', icon: 'wallet' },
        { name: 'Settings', href: '/dashboard/settings', icon: 'settings' },
    ];

    return (
        <div className="flex h-screen bg-[#050505] text-white overflow-hidden font-sans">
            {/* Sidebar */}
            <aside className="w-64 bg-zinc-950/80 border-r border-white/5 flex flex-col justify-between hidden md:flex z-20">
                <div>
                    <div className="h-24 flex items-center px-8 border-b border-white/5">
                        <Link href="/">
                            <Image src="/logo.png" alt="Vybes" width={110} height={35} className="invert object-contain" priority />
                        </Link>
                    </div>

                    <nav className="p-4 space-y-2 mt-4">
                        {navLinks.map((link) => {
                            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
                            return (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${isActive
                                            ? 'bg-purple-600/10 text-purple-400 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.05)]'
                                            : 'text-zinc-400 border border-transparent hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <Icon name={link.icon} />
                                    {link.name}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="p-4 border-t border-white/5 space-y-2 mb-4">
                    <button className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-zinc-400 border border-transparent hover:text-white hover:bg-white/5 transition">
                        <Icon name="support" />
                        Support
                    </button>
                    <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-rose-500 border border-transparent hover:bg-rose-500/10 hover:border-rose-500/20 transition">
                        <Icon name="logout" />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Viewport */}
            <div className="flex-1 flex flex-col h-screen overflow-y-auto relative bg-[#0a0a0a]">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-purple-900/10 blur-[150px] pointer-events-none -z-10"></div>

                {/* Shared Top Header */}
                <header className="h-24 flex items-center justify-between px-8 md:px-12 z-10 shrink-0">
                    <div>
                        <p className="text-zinc-400 text-sm font-medium mb-1">{greeting},</p>
                        <h1 className="text-2xl font-black text-white tracking-tight">{userName} 👋</h1>
                    </div>
                    <div className="flex gap-4">
                        <Link href="/scan" className="px-5 py-2.5 bg-zinc-900 border border-white/10 rounded-xl text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/10 transition shadow-lg hidden sm:flex items-center">
                            Manage Scanner Team
                        </Link>
                    </div>
                </header>

                {/* Sub-page Content Injection */}
                <main className="px-8 md:px-12 pb-12 z-10 flex-1">
                    {children}
                </main>
            </div>
        </div>
    );
}