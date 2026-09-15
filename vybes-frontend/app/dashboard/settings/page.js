'use client';
import { useState, useEffect } from 'react';

const FALLBACK_BANKS = [
    { name: 'Access Bank', code: '044' },
    { name: 'First Bank of Nigeria', code: '011' },
    { name: 'Guaranty Trust Bank (GTB)', code: '058' },
    { name: 'Zenith Bank', code: '057' },
    { name: 'United Bank for Africa (UBA)', code: '033' },
    { name: 'Opay /Paycom', code: '999992' },
    { name: 'Moniepoint MFB', code: '50515' }
];

export default function SettingsPage() {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileMsg, setProfileMsg] = useState('');

    const [accountNumber, setAccountNumber] = useState('');
    const [bankCode, setBankCode] = useState('');
    const [banks, setBanks] = useState(FALLBACK_BANKS);
    const [accountName, setAccountName] = useState('');
    const [resolving, setResolving] = useState(false);

    const [scanners, setScanners] = useState([]);
    const [scannerName, setScannerName] = useState('');
    const [scannerEmail, setScannerEmail] = useState('');
    const [scannerPassword, setScannerPassword] = useState('');
    const [scannerLoading, setScannerLoading] = useState(false);

    const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    // Every protected call needs this now that the backend requires auth
    const authHeaders = () => ({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('vybes_token')}`
    });

    const fetchScanners = async () => {
        try {
            const res = await fetch(`${getApiUrl()}/api/v1/scanners`, {
                headers: authHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                if (data.data) setScanners(data.data);
            }
        } catch (err) {
            console.error('Failed to fetch scanners:', err);
        }
    };

    useEffect(() => {
        setFullName(localStorage.getItem('vybes_user_name') || '');
        setEmail(localStorage.getItem('vybes_user_email') || '');

        fetch(`${getApiUrl()}/api/v1/payouts/banks`, {
            headers: authHeaders()
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.data && Array.isArray(data.data) && data.data.length > 0) setBanks(data.data);
            }).catch(() => { });

        fetchScanners();
    }, []);

    useEffect(() => {
        if (accountNumber.length === 10 && bankCode) {
            setResolving(true);
            fetch(`${getApiUrl()}/api/v1/payouts/resolve`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ account_number: accountNumber, bank_code: bankCode }),
            })
                .then((res) => res.json())
                .then((data) => {
                    setAccountName(data.data?.account_name ? data.data.account_name : '');
                    setResolving(false);
                })
                .catch(() => {
                    setAccountName('');
                    setResolving(false);
                });
        } else {
            setAccountName('');
        }
    }, [accountNumber, bankCode]);

    const handleSaveProfile = (e) => {
        e.preventDefault();
        setProfileSaving(true);
        localStorage.setItem('vybes_user_name', fullName);
        setTimeout(() => {
            setProfileSaving(false);
            setProfileMsg('Settings saved successfully.');
            setTimeout(() => setProfileMsg(''), 3000);
        }, 400);
    };

    const handleCreateScanner = async (e) => {
        e.preventDefault();
        if (!scannerEmail || !scannerPassword) return;
        setScannerLoading(true);
        try {
            const res = await fetch(`${getApiUrl()}/api/v1/scanners`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ name: scannerName, email: scannerEmail, password: scannerPassword }),
            });
            if (res.ok) {
                setScannerName('');
                setScannerEmail('');
                setScannerPassword('');
                fetchScanners();
            }
        } catch (err) {
            console.error('Create scanner error:', err);
        } finally {
            setScannerLoading(false);
        }
    };

    const handleRevokeScanner = async (id) => {
        try {
            await fetch(`${getApiUrl()}/api/v1/scanners/${id}`, {
                method: 'DELETE',
                headers: authHeaders()
            });
            fetchScanners();
        } catch (err) {
            console.error('Revoke error:', err);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-10 pb-16 pt-8">
            <div>
                <h1 className="text-3xl font-black text-white tracking-tight">Account Settings</h1>
                <p className="text-xs text-zinc-500 mt-1">Manage your creator profile, payout settlement destination, and team permissions.</p>
            </div>

            <form onSubmit={handleSaveProfile} className="bg-zinc-950/80 backdrop-blur-xl border border-white/5 rounded-3xl p-8 space-y-8 shadow-[0_8px_30px_rgb(0,0,0,0.5)]">
                {profileMsg && (
                    <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl font-medium flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        {profileMsg}
                    </div>
                )}

                <div>
                    <h2 className="text-sm font-bold tracking-wide uppercase text-zinc-400 mb-5 pb-3 border-b border-white/5">Profile Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2.5">Full Name</label>
                            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-4 py-3 bg-zinc-900/60 border border-white/10 rounded-xl text-sm text-white placeholder-zinc-600 outline-none focus:border-purple-500 focus:bg-zinc-900 transition shadow-inner" />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2.5">Email Address</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 bg-zinc-900/60 border border-white/10 rounded-xl text-sm text-zinc-300 placeholder-zinc-600 outline-none focus:border-purple-500 focus:bg-zinc-900 transition shadow-inner" />
                        </div>
                    </div>
                </div>

                <div>
                    <h2 className="text-sm font-bold tracking-wide uppercase text-zinc-400 mb-5 pb-3 border-b border-white/5">Payout Settlement Bank</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2.5">Account Number</label>
                            <input type="text" maxLength={10} placeholder="e.g. 0123456789" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))} className="w-full px-4 py-3 bg-zinc-900/60 border border-white/10 rounded-xl text-sm text-white placeholder-zinc-600 outline-none focus:border-purple-500 focus:bg-zinc-900 transition shadow-inner tracking-widest font-mono" />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2.5">Bank Provider</label>
                            <select value={bankCode} onChange={(e) => setBankCode(e.target.value)} className="w-full px-4 py-3 bg-zinc-900/60 border border-white/10 rounded-xl text-sm text-white outline-none focus:border-purple-500 focus:bg-zinc-900 transition shadow-inner">
                                <option value="" className="bg-zinc-900 text-zinc-500">Select bank institution...</option>
                                {banks.map((b, idx) => <option key={`${b.code}-${idx}`} value={b.code} className="bg-zinc-900 text-white">{b.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="mt-5">
                        <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2.5">Account Name (Auto-resolved)</label>
                        <div className={`w-full px-4 py-3.5 border rounded-xl text-sm font-semibold tracking-wide flex items-center justify-between transition-colors ${resolving ? 'bg-purple-950/20 border-purple-500/30 text-purple-300' : accountName ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' : 'bg-zinc-900/40 border-white/5 text-zinc-500'}`}>
                            <span>{resolving ? 'Verifying account with Paystack...' : accountName || 'Enter 10-digit number & bank to resolve'}</span>
                            {accountName && !resolving && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Verified</span>}
                        </div>
                    </div>
                </div>

                <div className="pt-4 flex justify-end border-t border-white/5">
                    <button type="submit" disabled={profileSaving} className="px-6 py-3 bg-white text-black font-bold rounded-xl text-sm hover:bg-zinc-200 transition active:scale-[0.98] shadow-lg disabled:opacity-50">
                        {profileSaving ? 'Saving Changes...' : 'Save Changes'}
                    </button>
                </div>
            </form>

            <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/5 rounded-3xl p-8 space-y-6 shadow-[0_8px_30px_rgb(0,0,0,0.5)]">
                <div>
                    <h2 className="text-lg font-bold text-white">Scanner Team Access</h2>
                    <p className="text-xs text-zinc-500 mt-1">Create scanner logins for teammates to help with ticket verification.</p>
                </div>

                <form onSubmit={handleCreateScanner} className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-4 border-t border-white/5 items-center">
                    <div className="md:col-span-3">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 md:hidden">Name</label>
                        <input type="text" placeholder="Scanner name (optional)" value={scannerName} onChange={(e) => setScannerName(e.target.value)} className="w-full px-4 py-3 bg-zinc-900/65 border border-white/10 rounded-xl text-sm text-white placeholder-zinc-600 outline-none focus:border-purple-500 transition shadow-inner" />
                    </div>
                    <div className="md:col-span-4">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 md:hidden">Email</label>
                        <input type="email" required placeholder="scanner@vybes.com" value={scannerEmail} onChange={(e) => setScannerEmail(e.target.value)} className="w-full px-4 py-3 bg-zinc-900/65 border border-white/10 rounded-xl text-sm text-white placeholder-zinc-600 outline-none focus:border-purple-500 transition shadow-inner" />
                    </div>
                    <div className="md:col-span-5 flex gap-2.5">
                        <div className="flex-1">
                            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 md:hidden">Password</label>
                            <input type="password" required placeholder="Password" value={scannerPassword} onChange={(e) => setScannerPassword(e.target.value)} className="w-full px-4 py-3 bg-zinc-900/65 border border-white/10 rounded-xl text-sm text-white placeholder-zinc-600 outline-none focus:border-purple-500 transition shadow-inner" />
                        </div>
                        <button type="submit" disabled={scannerLoading} className="px-6 py-3 bg-purple-600 text-white font-bold rounded-xl text-xs hover:bg-purple-500 transition shrink-0 active:scale-[0.98] shadow-[0_0_15px_rgba(168,85,247,0.3)] disabled:opacity-50 h-[46px] self-end md:self-auto">
                            {scannerLoading ? 'Adding...' : 'Add Team'}
                        </button>
                    </div>
                </form>

                <div className="pt-5 border-t border-white/5 space-y-3">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Active Scanners ({scanners.length})</h3>
                    {scanners.length === 0 ? (
                        <div className="p-6 bg-zinc-900/30 border border-white/5 rounded-2xl text-center">
                            <p className="text-xs text-zinc-500">No active scanner teammates assigned yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {scanners.map((s) => (
                                <div key={s.id} className="flex items-center justify-between p-4 bg-zinc-900/40 border border-white/5 rounded-2xl hover:border-white/10 transition">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-xs">
                                            {s.name ? s.name.charAt(0).toUpperCase() : 'S'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-white">{s.name || 'Scanner Teammate'}</p>
                                            <p className="text-xs text-zinc-500 font-mono">{s.email}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => handleRevokeScanner(s.id)} className="text-xs font-bold text-rose-400 hover:text-white px-3.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 hover:border-rose-500/40 transition active:scale-95">
                                        Revoke Access
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
