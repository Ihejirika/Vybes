'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function RegisterPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch(`${getApiUrl()}/api/v1/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, role: 'HOST' }),
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('vybes_token', data.token);
                localStorage.setItem('vybes_user_name', data.user?.name || name);
                localStorage.setItem('vybes_user_email', data.user?.email || email);
                router.push('/dashboard');
            } else {
                setError(data.message || 'Registration failed');
            }
        } catch (err) {
            console.error('Register error:', err);
            setError('Connection error. Verify backend server is running.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-black text-white flex items-center justify-center p-6 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="z-10 max-w-md w-full bg-zinc-950/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-[2px] bg-gradient-to-r from-purple-500 to-pink-500 blur-[1px]"></div>

                <div className="flex justify-center mb-8 mt-2">
                    <Image src="/logo.png" alt="Vybe" width={140} height={45} className="invert object-contain mix-blend-screen" priority />
                </div>

                {error && <div className="mb-6 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl text-center font-medium">{error}</div>}

                <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Full Name</label>
                        <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm text-white outline-none focus:border-purple-500 focus:bg-black transition" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Email Address</label>
                        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm text-white outline-none focus:border-purple-500 focus:bg-black transition" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Password</label>
                        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm text-white outline-none focus:border-purple-500 focus:bg-black transition" />
                    </div>
                    <button type="submit" disabled={loading} className="w-full bg-white text-black font-bold py-3 rounded-xl text-sm mt-4 hover:bg-zinc-200 transition active:scale-[0.98] disabled:opacity-50">
                        {loading ? 'Creating Account...' : 'Create Account'}
                    </button>
                </form>
                <p className="text-center text-xs text-zinc-500 mt-8 font-medium">Already have an account? <Link href="/login" className="text-purple-400 hover:text-purple-300 transition">Sign in</Link></p>
            </div>
        </main>
    );
}