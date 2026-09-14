'use client';
import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function GateScannerPage() {
    const [codeInput, setCodeInput] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [cameraActive, setCameraActive] = useState(false);
    const scannerInstanceRef = useRef(null);

    const handleVerifyCode = async (targetCode) => {
        const cleanCode = targetCode.trim().toUpperCase();
        setCodeInput(cleanCode);
        setLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/tickets/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // check_in: true is required, otherwise the backend only performs
                // a read-only lookup and never flips is_used to TRUE.
                body: JSON.stringify({ ticket_code: cleanCode, check_in: true }),
            });
            const data = await res.json();

            // Backend shape: { status, message, data }
            // Normalize into what the UI expects: { ok, message, ticket, tier }
            setResult({
                ok: res.ok && data.status === 'valid',
                message: data.message,
                ticket: data.data,
                tier: data.data?.tier_name,
            });
        } catch {
            setResult({ ok: false, message: 'Connection interrupted.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (cameraActive) {
            const scanner = new Html5Qrcode('qr-reader');
            scannerInstanceRef.current = scanner;
            scanner.start(
                { facingMode: 'environment' },
                { fps: 15, qrbox: { width: 220, height: 220 } },
                (decodedText) => {
                    scanner.stop().then(() => {
                        setCameraActive(false);
                        scannerInstanceRef.current = null;
                    }).catch(() => { });
                    handleVerifyCode(decodedText);
                },
                () => { }
            ).catch((err) => {
                console.error('Camera initialization failed:', err);
                setCameraActive(false);
            });
        }
        return () => {
            if (scannerInstanceRef.current && scannerInstanceRef.current.isScanning) {
                scannerInstanceRef.current.stop().catch(() => { });
            }
        };
    }, [cameraActive]);

    const toggleCamera = () => {
        setResult(null);
        if (cameraActive) {
            if (scannerInstanceRef.current && scannerInstanceRef.current.isScanning) {
                scannerInstanceRef.current.stop().catch(() => { });
            }
            setCameraActive(false);
            scannerInstanceRef.current = null;
        } else {
            setCameraActive(true);
        }
    };

    return (
        <main className="min-h-[calc(100vh-64px)] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="z-10 w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-black tracking-widest uppercase">Gate Terminal</h1>
                    <p className="text-zinc-500 text-xs mt-1 font-medium">Scan attendee QR pass or enter serial manually.</p>
                </div>

                <div className="mb-6 bg-zinc-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
                    {cameraActive ? (
                        <div id="qr-reader" className="w-full aspect-square bg-black"></div>
                    ) : (
                        <div className="aspect-video flex flex-col items-center justify-center p-6 bg-zinc-950/60 text-center">
                            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3 text-lg">
                                📷
                            </div>
                            <p className="text-xs text-zinc-400 mb-4">Camera viewfinder is offline</p>
                            <button
                                onClick={toggleCamera}
                                className="px-5 py-2.5 bg-white text-black font-bold rounded-xl text-xs hover:bg-zinc-200 transition active:scale-95"
                            >
                                Activate Camera
                            </button>
                        </div>
                    )}
                    {cameraActive && (
                        <button
                            onClick={toggleCamera}
                            className="w-full py-3 bg-zinc-900 border-t border-white/10 text-xs font-bold text-zinc-400 hover:text-white transition"
                        >
                            Stop Camera
                        </button>
                    )}
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleVerifyCode(codeInput); }} className="space-y-4">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="VYBES-XXXXXXXX"
                            value={codeInput}
                            onChange={(e) => setCodeInput(e.target.value)}
                            className="w-full px-5 py-4 bg-zinc-950/80 backdrop-blur-md border border-white/10 rounded-2xl text-center text-sm font-mono text-white placeholder:text-zinc-700 outline-none focus:border-purple-500 transition uppercase shadow-xl"
                        />
                    </div>
                </form>

                {result && (
                    <div className={`mt-6 p-6 rounded-3xl backdrop-blur-xl border animate-in slide-in-from-bottom-4 duration-300 shadow-2xl ${result.ok
                        ? 'bg-emerald-950/40 border-emerald-500/30'
                        : 'bg-rose-950/40 border-rose-500/30'
                        }`}>
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${result.ok ? 'bg-emerald-500 text-emerald-950' : 'bg-rose-500 text-rose-950'}`}>
                                {result.ok ? '✓' : '✕'}
                            </div>
                            <p className={`font-black tracking-widest uppercase text-sm ${result.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {result.ok ? 'Access Granted' : 'Entry Denied'}
                            </p>
                        </div>

                        <p className="text-zinc-300 text-xs mb-4 leading-relaxed">{result.message}</p>

                        {result.ticket && (
                            <div className="pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Pass Tier</p>
                                    <p className="text-xs font-semibold text-white">{result.tier}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Serial</p>
                                    <p className="text-xs font-mono text-zinc-300">{result.ticket.ticket_code}</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}
