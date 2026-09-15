'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function SuccessPage() {
    const searchParams = useSearchParams();
    const reference = searchParams.get('reference') || searchParams.get('trxref');

    // 'checking' | 'success' | 'pending' | 'failed' | 'error'
    const [state, setState] = useState('checking');
    const [details, setDetails] = useState(null);

    useEffect(() => {
        if (!reference) {
            setState('error');
            return;
        }

        let attempts = 0;
        let cancelled = false;

        // Paystack's webhook can arrive a moment after the redirect, so poll briefly
        // rather than declaring failure on the very first check.
        const checkStatus = async () => {
            try {
                const res = await fetch(`${getApiUrl()}/api/v1/checkout/order/${reference}`);
                const data = await res.json();

                if (cancelled) return;

                if (!res.ok) {
                    setState('error');
                    return;
                }

                setDetails(data.data);

                if (data.data.status === 'SUCCESS') {
                    setState('success');
                } else if (data.data.status === 'FAILED' || data.data.status === 'EXPIRED') {
                    setState('failed');
                } else if (attempts < 6) {
                    attempts += 1;
                    setTimeout(checkStatus, 2000);
                } else {
                    setState('pending');
                }
            } catch (err) {
                if (!cancelled) setState('error');
            }
        };

        checkStatus();
        return () => { cancelled = true; };
    }, [reference]);

    const content = {
        checking: {
            icon: '⏳',
            iconClass: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
            title: 'Confirming your payment...',
            message: 'Hang tight while we verify your transaction with Paystack.',
        },
        success: {
            icon: '✓',
            iconClass: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
            title: 'Payment Successful!',
            message: `Your ticket${details?.tier_name ? ` (${details.tier_name})` : ''} for ${details?.event_title || 'your event'} has been secured. Check your email for your QR code pass.`,
        },
        pending: {
            icon: '⏳',
            iconClass: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
            title: 'Still confirming...',
            message: 'Your payment is taking a bit longer to confirm than usual. If you were charged, your ticket email will arrive shortly — no need to pay again.',
        },
        failed: {
            icon: '✕',
            iconClass: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
            title: 'Payment Not Completed',
            message: 'This transaction was not successful or the reservation expired. No ticket was issued. Please try checking out again.',
        },
        error: {
            icon: '!',
            iconClass: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
            title: 'Unable to Verify Payment',
            message: 'We could not find a matching transaction. If you were charged, please contact support with your payment reference.',
        },
    }[state];

    return (
        <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center font-sans">
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-md w-full shadow-2xl">
                <div className={`w-16 h-16 border rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-black ${content.iconClass}`}>
                    {content.icon}
                </div>
                <h1 className="text-2xl font-black mb-2">{content.title}</h1>
                <p className="text-zinc-400 text-sm mb-6">{content.message}</p>
                <Link href="/" className="block w-full bg-white text-black font-bold py-3 rounded-xl text-sm hover:bg-zinc-200 transition">
                    Back to Events
                </Link>
            </div>
        </main>
    );
}