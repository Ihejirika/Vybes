'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('vybes_buyer_email') || '' : ''
  );
  const [checkingOutTier, setCheckingOutTier] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);
  const [copiedLink, setCopiedLink] = useState(null);

  const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetch(`${getApiUrl()}/api/v1/events`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success') setEvents(data.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleCheckout = async (tierId, price) => {
    if (!email) {
      alert('Please enter your delivery email address above before purchasing.');
      return;
    }
    setCheckingOutTier(tierId);
    try {
      const res = await fetch(`${getApiUrl()}/api/v1/checkout/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyer_email: email, tier_id: tierId, total_amount: price }),
      });
      const data = await res.json();
      if (data.status === 'success' && data.data?.authorization_url) {
        window.location.href = data.data.authorization_url;
      } else if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        alert(data.message || 'Checkout failed');
        setCheckingOutTier(null);
      }
    } catch (error) {
      alert('Payment gateway connection error.');
      setCheckingOutTier(null);
    }
  };

  const handleCopyEventLink = (eventId) => {
    const url = `${window.location.origin}/events/${eventId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(eventId);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  const faqs = [
    { q: 'How much does it cost to use this platform?', a: 'Free events stay free. Ticketed events are 5% + ₦100 per paid ticket. Voting events are 8%.' },
    { q: 'Are there any hidden fees?', a: 'None. Fees are transparently handled per tier or structured per plan.' },
    { q: 'How is the service fee deducted?', a: 'Deducted automatically during processing or split out transparently upon settlement.' },
    { q: 'Do buyers pay extra fees?', a: 'Standard flat rate or inclusive pricing options configured directly by the event creator.' },
    { q: 'How do I get paid for ticket sales?', a: 'Payouts route directly via Paystack to your verified business or personal bank account.' },
    { q: 'When will I receive my payouts?', a: 'T+1 business day standard settlement cycle.' },
    { q: 'How do I check in attendees?', a: 'Use your phone browser at /scan with live camera QR decoding or manual lookup.' },
  ];

  return (
    <main className="font-sans pb-20 selection:bg-purple-500/30 selection:text-purple-200">
      {/* Hero Section */}
      <section className="pt-24 pb-16 text-center max-w-5xl mx-auto px-6 relative">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold tracking-wider uppercase mb-8">
          <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
          Engineered for High-Concurrency Events
        </div>

        <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight bg-gradient-to-r from-purple-400 via-white to-zinc-400 bg-clip-text text-transparent leading-[1.08]">
          Your front row seat to life's best moments
        </h1>

        <p className="text-zinc-400 text-base md:text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
          Sell tickets seamlessly, track every sale in real-time, scan attendees at the gate with mobile precision, and manage payouts with enterprise confidence.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mb-20">
          <Link href="#events" className="px-8 py-4 bg-purple-600 text-white font-bold rounded-2xl text-sm hover:bg-purple-500 transition active:scale-95 shadow-[0_0_30px_rgba(168,85,247,0.4)]">
            Explore Live Events →
          </Link>
          <Link href="/register" className="px-8 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-2xl text-sm hover:bg-white/10 transition active:scale-95">
            Start Hosting Free
          </Link>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto border-t border-b border-white/5 py-8 backdrop-blur-sm">
          <div>
            <div className="text-3xl font-black text-white tracking-tight">1K+</div>
            <div className="text-[11px] text-zinc-500 uppercase tracking-widest mt-1 font-semibold">Events Hosted</div>
          </div>
          <div>
            <div className="text-3xl font-black text-white tracking-tight">60K+</div>
            <div className="text-[11px] text-zinc-500 uppercase tracking-widest mt-1 font-semibold">Tickets Sold</div>
          </div>
          <div>
            <div className="text-3xl font-black text-white tracking-tight">2K+</div>
            <div className="text-[11px] text-zinc-500 uppercase tracking-widest mt-1 font-semibold">Organizers</div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-[10px] uppercase tracking-widest text-purple-400 font-bold bg-purple-500/10 px-3 py-1.5 rounded-full border border-purple-500/20">How It Works</span>
          <h2 className="text-3xl md:text-5xl font-black mt-4 tracking-tight">Three steps to a stronger event launch.</h2>
          <p className="text-zinc-500 text-sm mt-2">No technical skills required. If you can share a link, you can sell tickets.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { step: '01', title: 'Create Your Event', desc: 'Add flyer details, write your event narrative, configure tiered pricing, and publish with a clean public URL.' },
            { step: '02', title: 'Sell Tickets Online', desc: 'Share your unique event link anywhere. Attendees pay securely via Paystack and receive QR-coded passes straight to inbox.' },
            { step: '03', title: 'Check In & Get Paid', desc: 'Scan attendees at the door using your mobile browser. Request automated T+1 payouts straight to your verified bank account.' }
          ].map((item) => (
            <div key={item.step} className="bg-zinc-950/80 border border-white/5 rounded-3xl p-8 flex flex-col justify-between hover:border-white/10 transition-colors">
              <div>
                <span className="text-4xl font-black text-purple-500/40 font-mono mb-4 block">{item.step}</span>
                <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Purple Features Box */}
      <section className="py-12 max-w-6xl mx-auto px-6">
        <div className="bg-gradient-to-br from-purple-900/60 via-purple-950/80 to-zinc-950 border border-purple-500/30 rounded-[32px] p-8 md:p-16 text-white shadow-2xl relative overflow-hidden">
          <div className="max-w-xl mb-12 relative z-10">
            <span className="text-[10px] uppercase tracking-widest text-purple-300 font-bold bg-white/10 px-3 py-1.5 rounded-full">Features</span>
            <h2 className="text-3xl md:text-5xl font-black mt-4 tracking-tight">Everything you need to run a great event</h2>
            <p className="text-purple-200/70 text-sm mt-2">All the tools serious organizers use — included in every plan, at no extra cost.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
            {[
              { title: 'QR Code Check-In', desc: 'Every ticket gets a cryptographically unique QR code. Scan attendees at the gate in seconds.' },
              { title: 'Discount Codes', desc: 'Reward early-bird buyers with percentage or fixed-amount promotional code restrictions.' },
              { title: 'Referral Links', desc: 'Turn your community into an acquisition engine with trackable unique referral identifiers.' },
              { title: 'Complimentary Passes', desc: 'Issue free executive, media, or partner VIP passes instantly with validated QR access.' },
              { title: 'Live Analytics', desc: 'Watch velocity, check-in conversion rates, and gross settlement volume in real-time.' },
              { title: 'Fraud-Proof Architecture', desc: 'Multi-layer serial validation with instant duplicate-scan rejection at the gate terminal.' }
            ].map((f, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm hover:bg-white/[0.08] transition">
                <h4 className="font-bold text-sm text-white mb-2">{f.title}</h4>
                <p className="text-xs text-purple-200/60 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Events Feed */}
      <section id="events" className="py-24 max-w-5xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight">Live & Upcoming Events</h2>
          <p className="text-zinc-500 text-sm mt-1">Real events, real energy. Enter delivery email, pick your tier, and checkout.</p>
        </div>

        {/* Email Capture Input */}
        <div className="mb-16 max-w-md mx-auto relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
          <div className="relative bg-zinc-950 border border-white/10 rounded-2xl p-2.5 flex items-center shadow-2xl">
            <input
              type="email"
              placeholder="yourname@gmail.com (for ticket delivery)"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (typeof window !== 'undefined') {
                  localStorage.setItem('vybes_buyer_email', e.target.value);
                }
              }}
              className="w-full bg-transparent px-4 py-2 outline-none text-sm placeholder:text-zinc-600 text-white font-medium"
            />
            <div className="px-3 py-1.5 bg-zinc-900 rounded-xl border border-white/5 text-[10px] uppercase tracking-widest text-zinc-400 font-bold whitespace-nowrap shadow-inner">
              Delivery Email
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center space-y-4 py-20">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-zinc-500 text-sm font-medium tracking-widest uppercase">Loading Events</p>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-zinc-800 rounded-3xl bg-zinc-950/40">
            <p className="text-zinc-500 text-sm font-medium">No live events published at the moment.</p>
            <Link href="/register" className="inline-block mt-4 text-xs font-bold text-purple-400 hover:text-purple-300">Publish your first event →</Link>
          </div>
        ) : (
          <div className="space-y-8 text-left">
            {events.map((event) => (
              <div key={event.id} className="group relative bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-1 overflow-hidden hover:border-white/15 transition duration-500 shadow-xl">
                <div className="p-6 md:p-8">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold tracking-wider uppercase text-zinc-300">
                          {event.category || 'Live Event'}
                        </span>
                      </div>
                      <h3 className="text-2xl md:text-3xl font-black text-white">{event.title}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-zinc-400 mt-2">
                        <span className="flex items-center gap-1.5">📍 {event.venue_name}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1.5">📅 {new Date(event.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopyEventLink(event.id)}
                      className="self-start md:self-auto px-3.5 py-2 bg-zinc-900 border border-white/10 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 transition active:scale-95 flex items-center gap-2"
                    >
                      {copiedLink === event.id ? '✓ Link Copied!' : 'Share Event ↗'}
                    </button>
                  </div>

                  {event.description && (
                    <p className="text-xs text-zinc-400 mb-6 leading-relaxed max-w-3xl">{event.description}</p>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {event.tiers?.map((tier) => {
                      const isSoldOut = tier.quantity_sold >= tier.total_capacity;
                      const remaining = Math.max(0, tier.total_capacity - tier.quantity_sold);
                      const isCheckingThisTier = checkingOutTier === tier.id;
                      return (
                        <div key={tier.id} className="relative bg-black/60 border border-white/5 rounded-2xl p-5 hover:bg-zinc-900/80 transition flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-center mb-1.5">
                              <h4 className="font-bold text-white uppercase tracking-wide text-xs">{tier.name}</h4>
                              {isSoldOut ? (
                                <span className="text-[9px] uppercase tracking-widest text-rose-400 font-bold bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 rounded-full">Sold Out</span>
                              ) : remaining <= 5 ? (
                                <span className="text-[9px] uppercase tracking-widest text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">Only {remaining} left</span>
                              ) : (
                                <span className="text-[9px] text-zinc-500 font-mono">{remaining} avail</span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-500 mb-6 line-clamp-2 leading-relaxed">{tier.description || 'General admission ticket tier.'}</p>
                          </div>
                          <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                            <span className="text-lg font-black text-white">₦{Number(tier.price).toLocaleString()}</span>
                            <button
                              disabled={isSoldOut || checkingOutTier !== null}
                              onClick={() => handleCheckout(tier.id, tier.price)}
                              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${isSoldOut
                                  ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed border border-white/5'
                                  : 'bg-white text-black hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] active:scale-95'
                                }`}
                            >
                              {isCheckingThisTier ? 'Routing...' : isSoldOut ? 'Sold Out' : 'Purchase'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-[10px] uppercase tracking-widest text-purple-400 font-bold bg-purple-500/10 px-3 py-1.5 rounded-full border border-purple-500/20">Pricing</span>
          <h2 className="text-3xl md:text-5xl font-black mt-4 tracking-tight">Clear pricing. No mystery math.</h2>
          <p className="text-zinc-500 text-sm mt-2 max-w-xl mx-auto">Free events stay free, normal ticketed events are 5% + ₦100, and voting events are charged at 8%.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { tier: 'FREE EVENTS', price: '₦0', sub: 'Per ticket, always', desc: 'Hosting a free event? We charge a single kobo.' },
            { tier: 'TICKET EVENTS', price: '5%', tag: 'Most Used', sub: '+ ₦100 per paid ticket', desc: 'Predictable pricing so organizers plan clearly.' },
            { tier: 'VOTING EVENTS', price: '8%', sub: 'Per vote purchase', desc: 'Transparent fee handling and live vote tracking.' },
            { tier: 'CUSTOM SERVICES', price: 'Quote', sub: 'For advanced operations', desc: 'Wristbands, printing, on-site support setup.' }
          ].map((p, idx) => (
            <div key={idx} className="bg-zinc-950 border border-white/5 rounded-3xl p-6 flex flex-col justify-between hover:border-white/10 transition">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{p.tier}</span>
                  {p.tag && <span className="text-[9px] bg-purple-500/20 text-purple-300 font-bold px-2 py-0.5 rounded-full">{p.tag}</span>}
                </div>
                <div className="text-3xl font-black text-white mb-1">{p.price}</div>
                <div className="text-[11px] text-zinc-400 font-medium mb-4">{p.sub}</div>
                <p className="text-xs text-zinc-500 leading-relaxed">{p.desc}</p>
              </div>
              <div className="mt-8 pt-4 border-t border-white/5">
                <Link href="/register" className="block text-center w-full py-3 bg-white/5 hover:bg-white/10 text-white font-bold text-xs rounded-xl transition">
                  {idx === 3 ? 'Contact Sales' : 'Get Started'}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQs Section */}
      <section id="faqs" className="py-24 max-w-3xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-[10px] uppercase tracking-widest text-purple-400 font-bold bg-purple-500/10 px-3 py-1.5 rounded-full border border-purple-500/20">FAQs</span>
          <h2 className="text-3xl md:text-5xl font-black mt-4 tracking-tight">Questions, answered clearly.</h2>
          <p className="text-zinc-500 text-sm mt-2">Everything you need to know about selling tickets on Vybes.</p>
        </div>
        <div className="space-y-4">
          {faqs.map((item, idx) => (
            <div key={idx} className="bg-zinc-950/80 border border-white/5 rounded-2xl overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full px-6 py-5 text-left flex items-center justify-between text-sm font-bold text-white hover:bg-white/5 transition"
              >
                <span>{item.q}</span>
                <span className="text-zinc-500 text-base">{openFaq === idx ? '−' : '+'}</span>
              </button>
              {openFaq === idx && (
                <div className="px-6 pb-5 text-xs text-zinc-400 leading-relaxed border-t border-white/5 pt-4">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA Banner */}
      <section className="py-12 max-w-5xl mx-auto px-6">
        <div className="bg-gradient-to-r from-purple-900/40 via-purple-950 to-zinc-950 border border-purple-500/20 rounded-[32px] p-12 text-center shadow-2xl">
          <h2 className="text-3xl md:text-4xl font-black mb-4 tracking-tight">Your next event deserves better ticketing.</h2>
          <p className="text-zinc-400 text-xs md:text-sm mb-8 max-w-md mx-auto">Setup is free, multi-tier ready, and takes less than 5 minutes.</p>
          <Link href="/register" className="inline-block px-8 py-4 bg-white text-black font-bold rounded-2xl text-xs hover:bg-zinc-200 transition active:scale-95 shadow-lg">
            Create Free Account →
          </Link>
        </div>
      </section>
    </main>
  );
}