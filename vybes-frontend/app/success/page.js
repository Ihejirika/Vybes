import Link from 'next/link';

export default function SuccessPage() {
    return (
        <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center font-sans">
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-md w-full shadow-2xl">
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-black">
                    ✓
                </div>
                <h1 className="text-2xl font-black mb-2">Payment Successful!</h1>
                <p className="text-zinc-400 text-sm mb-6">
                    Your ticket has been secured. Once processed, you will receive an email with your unique QR code pass.
                </p>
                <Link href="/" className="block w-full bg-white text-black font-bold py-3 rounded-xl text-sm hover:bg-zinc-200 transition">
                    Back to Events
                </Link>
            </div>
        </main>
    );
}