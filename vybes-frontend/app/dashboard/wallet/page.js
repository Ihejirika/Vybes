'use client';
import { useState, useEffect, useCallback } from 'react';

const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

function authHeaders() {
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('vybes_token')}`,
    };
}

async function apiFetch(path, options = {}) {
    const res = await fetch(`${getApiUrl()}${path}`, {
        ...options,
        headers: { ...authHeaders(), ...(options.headers || {}) },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.status === 'error') {
        throw new Error(data.message || 'Something went wrong');
    }
    return data;
}

function formatNaira(amount) {
    return `₦${Number(amount || 0).toLocaleString()}`;
}

function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

const STATUS_STYLES = {
    SUCCESS: { label: 'Completed', className: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
    PROCESSING: { label: 'Processing', className: 'bg-amber-500/10 border-amber-500/20 text-amber-400' },
    PENDING: { label: 'Processing', className: 'bg-amber-500/10 border-amber-500/20 text-amber-400' },
    FAILED: { label: 'Failed', className: 'bg-rose-500/10 border-rose-500/20 text-rose-400' },
};

function StatusPill({ status }) {
    const s = STATUS_STYLES[status] || STATUS_STYLES.PROCESSING;
    return (
        <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border whitespace-nowrap ${s.className}`}>
            {s.label}
        </span>
    );
}

export default function WalletPage() {
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    const [balance, setBalance] = useState({ available: 0, pending: 0 });
    const [payouts, setPayouts] = useState([]);
    const [accounts, setAccounts] = useState([]);

    const [formOpen, setFormOpen] = useState(false);
    const [amount, setAmount] = useState('');
    const [accountId, setAccountId] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');

    const [addingAccount, setAddingAccount] = useState(false);
    const [banks, setBanks] = useState([]);
    const [banksLoading, setBanksLoading] = useState(false);
    const [bankCode, setBankCode] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [resolvedName, setResolvedName] = useState('');
    const [resolving, setResolving] = useState(false);
    const [savingAccount, setSavingAccount] = useState(false);
    const [addAccountError, setAddAccountError] = useState('');

    const loadAll = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        try {
            const [balanceRes, payoutsRes, accountsRes] = await Promise.all([
                apiFetch('/api/v1/payouts/balance'),
                apiFetch('/api/v1/payouts'),
                apiFetch('/api/v1/payouts/accounts'),
            ]);
            setBalance(balanceRes.data);
            setPayouts(payoutsRes.data);
            setAccounts(accountsRes.data);
            setAccountId((prev) => prev || accountsRes.data[0]?.id || '');
        } catch (err) {
            setLoadError(err.message || "Couldn't load your wallet.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    async function loadBanks() {
        setBanksLoading(true);
        try {
            const res = await apiFetch('/api/v1/payouts/banks');
            setBanks(res.data || []);
        } catch (err) {
            setAddAccountError(err.message || "Couldn't load the bank list.");
        } finally {
            setBanksLoading(false);
        }
    }

    function openAddAccount() {
        setAddingAccount(true);
        setAddAccountError('');
        setResolvedName('');
        setAccountNumber('');
        setBankCode('');
        if (banks.length === 0) loadBanks();
    }

    async function handleResolve() {
        setAddAccountError('');
        setResolvedName('');
        if (!bankCode || accountNumber.length < 10) {
            setAddAccountError('Choose a bank and enter a valid account number.');
            return;
        }
        setResolving(true);
        try {
            const res = await apiFetch('/api/v1/payouts/resolve', {
                method: 'POST',
                body: JSON.stringify({ account_number: accountNumber, bank_code: bankCode }),
            });
            setResolvedName(res.data.account_name);
        } catch (err) {
            setAddAccountError(err.message || "Couldn't verify that account.");
        } finally {
            setResolving(false);
        }
    }

    async function handleSaveAccount() {
        setSavingAccount(true);
        setAddAccountError('');
        try {
            const res = await apiFetch('/api/v1/payouts/accounts', {
                method: 'POST',
                body: JSON.stringify({ account_number: accountNumber, bank_code: bankCode }),
            });
            setAccounts((prev) => [res.data, ...prev]);
            setAccountId(res.data.id);
            setAddingAccount(false);
        } catch (err) {
            setAddAccountError(err.message || "Couldn't save that account.");
        } finally {
            setSavingAccount(false);
        }
    }

    async function handleWithdraw(e) {
        e.preventDefault();
        setFormError('');

        const amountValue = Number(amount);
        if (!amountValue || amountValue <= 0) {
            setFormError('Enter an amount to withdraw.');
            return;
        }
        if (amountValue > balance.available) {
            setFormError("That's more than your available balance.");
            return;
        }
        if (!accountId) {
            setFormError('Choose or add an account to withdraw to.');
            return;
        }

        setSubmitting(true);
        try {
            await apiFetch('/api/v1/payouts/withdraw', {
                method: 'POST',
                body: JSON.stringify({ amount: amountValue, bank_account_id: accountId }),
            });
            setAmount('');
            setFormOpen(false);
            await loadAll();
        } catch (err) {
            setFormError(err.message || 'Withdrawal failed. Try again.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <main className="min-h-screen bg-[#050505] text-white p-6 md:p-12 font-sans relative">
            <div className="absolute top-0 left-0 w-full h-96 bg-purple-900/10 blur-[120px] pointer-events-none"></div>

            <div className="max-w-4xl mx-auto relative z-10">
                <div className="flex items-center justify-between mb-10 pb-6 border-b border-white/5">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight">Wallet</h1>
                        <p className="text-zinc-500 text-xs mt-1 font-medium">Withdraw funds from your ticket sales.</p>
                    </div>
                </div>

                {loading ? (
                    <p className="text-zinc-500 text-sm">Loading your wallet...</p>
                ) : loadError ? (
                    <div className="bg-rose-950/40 border border-rose-500/30 rounded-3xl p-6">
                        <p className="text-rose-400 text-sm font-medium">{loadError}</p>
                        <button onClick={loadAll} className="mt-3 text-xs font-bold text-purple-400 hover:text-purple-300 transition">
                            Try again
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Balance */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 p-6 rounded-3xl">
                                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Available for withdrawal</p>
                                <p className="text-3xl font-black text-white mt-2">{formatNaira(balance.available)}</p>
                            </div>
                            <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 p-6 rounded-3xl">
                                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Currently processing</p>
                                <p className="text-3xl font-black text-white mt-2">{formatNaira(balance.pending)}</p>
                            </div>
                        </div>

                        <button
                            onClick={() => setFormOpen((v) => !v)}
                            className="bg-white text-black font-bold py-3 px-6 rounded-xl text-sm hover:bg-zinc-200 transition active:scale-[0.98] mb-8"
                        >
                            {formOpen ? 'Cancel withdrawal' : 'Withdraw funds'}
                        </button>

                        {/* Withdraw form */}
                        {formOpen && (
                            <form onSubmit={handleWithdraw} className="bg-zinc-950/60 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl mb-8 space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Amount</label>
                                    <div className="flex items-center px-4 bg-black/50 border border-white/10 rounded-xl focus-within:border-purple-500 transition">
                                        <span className="text-zinc-500 text-sm">₦</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            placeholder="0"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            className="w-full bg-transparent px-2 py-3 text-sm text-white outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Send to</label>

                                    {accounts.length > 0 && !addingAccount && (
                                        <select
                                            value={accountId}
                                            onChange={(e) => setAccountId(e.target.value)}
                                            className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm text-white outline-none focus:border-purple-500 transition"
                                        >
                                            {accounts.map((a) => (
                                                <option key={a.id} value={a.id}>
                                                    {a.bank_name} •••• {a.account_number.slice(-4)} — {a.account_name}
                                                </option>
                                            ))}
                                        </select>
                                    )}

                                    {!addingAccount && (
                                        <button
                                            type="button"
                                            onClick={openAddAccount}
                                            className="mt-2 text-xs font-bold text-purple-400 hover:text-purple-300 transition"
                                        >
                                            {accounts.length > 0 ? '+ Use a different account' : '+ Add a bank account'}
                                        </button>
                                    )}

                                    {addingAccount && (
                                        <div className="mt-2 space-y-3 bg-black/40 border border-white/10 rounded-2xl p-5">
                                            <div>
                                                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Bank</label>
                                                <select
                                                    value={bankCode}
                                                    onChange={(e) => { setBankCode(e.target.value); setResolvedName(''); }}
                                                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm text-white outline-none focus:border-purple-500 transition"
                                                >
                                                    <option value="">{banksLoading ? 'Loading banks...' : 'Select a bank'}</option>
                                                    {banks.map((b) => (
                                                        <option key={b.code} value={b.code}>{b.name}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Account number</label>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    maxLength={10}
                                                    value={accountNumber}
                                                    onChange={(e) => { setAccountNumber(e.target.value.replace(/\D/g, '')); setResolvedName(''); }}
                                                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm text-white outline-none focus:border-purple-500 transition"
                                                />
                                            </div>

                                            {resolvedName ? (
                                                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl px-4 py-2.5 text-xs font-semibold">
                                                    Verified: {resolvedName}
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={handleResolve}
                                                    disabled={resolving}
                                                    className="text-xs font-bold bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition disabled:opacity-50"
                                                >
                                                    {resolving ? 'Verifying...' : 'Verify account'}
                                                </button>
                                            )}

                                            {addAccountError && <p className="text-rose-400 text-xs font-medium">{addAccountError}</p>}

                                            <div className="flex gap-3">
                                                <button
                                                    type="button"
                                                    onClick={handleSaveAccount}
                                                    disabled={!resolvedName || savingAccount}
                                                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                                                >
                                                    {savingAccount ? 'Saving...' : 'Save & use this account'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setAddingAccount(false)}
                                                    className="text-xs font-bold text-zinc-500 hover:text-zinc-300 transition"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {formError && <p className="text-rose-400 text-xs font-medium">{formError}</p>}

                                <button
                                    type="submit"
                                    disabled={submitting || addingAccount}
                                    className="w-full bg-white text-black font-bold py-3 rounded-xl text-sm hover:bg-zinc-200 transition active:scale-[0.98] disabled:opacity-50"
                                >
                                    {submitting ? 'Sending...' : 'Confirm withdrawal'}
                                </button>
                            </form>
                        )}

                        {/* Payout history */}
                        <div>
                            <h2 className="text-lg font-black tracking-tight mb-4">Payout History</h2>
                            <div className="bg-zinc-950/60 backdrop-blur-xl border border-white/10 rounded-3xl divide-y divide-white/5 overflow-hidden">
                                {payouts.length === 0 && (
                                    <p className="p-8 text-zinc-500 text-sm text-center">No withdrawals yet. Funds you pull out will show up here.</p>
                                )}
                                {payouts.map((p) => (
                                    <div key={p.id} className="flex items-center justify-between p-5">
                                        <div>
                                            <p className="text-sm font-bold text-white">{formatNaira(p.amount)}</p>
                                            <p className="text-xs text-zinc-500 mt-1">
                                                {p.bank_name} •••• {p.account_last4} · {formatDate(p.created_at)}
                                            </p>
                                            {p.status === 'FAILED' && p.failure_reason && (
                                                <p className="text-xs text-rose-400 mt-1">{p.failure_reason}</p>
                                            )}
                                        </div>
                                        <StatusPill status={p.status} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </main>
    );
}