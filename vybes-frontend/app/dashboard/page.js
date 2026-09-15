'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CreatorDashboard() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [eventForm, setEventForm] = useState({ title: '', description: '', category: 'Party', venue_name: '', city: 'Port Harcourt', start_time: '' });
    const [tierForm, setTierForm] = useState({ event_id: '', name: '', description: '', price: '', total_capacity: '' });

    const authHeaders = () => ({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('vybes_token')}`
    });

    const fetchEvents = () => {
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/events/mine`, {
            headers: authHeaders()
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.status === 'success') {
                    setEvents(data.data || []);
                    if ((data.data || []).length > 0 && !tierForm.event_id) setTierForm((prev) => ({ ...prev, event_id: data.data[0].id }));
                }
                setLoading(false);
            });
    };

    useEffect(() => { fetchEvents(); }, []);

    const handleCreateEvent = async (e) => {
        e.preventDefault();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/events`, {
            method: 'POST', headers: authHeaders(), body: JSON.stringify(eventForm),
        });
        if (res.ok) { alert('Event published successfully.'); fetchEvents(); }
    };

    const handleCreateTier = async (e) => {
        e.preventDefault();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/events/${tierForm.event_id}/tiers`, {
            method: 'POST', headers: authHeaders(), body: JSON.stringify({ ...tierForm, price: Number(tierForm.price), total_capacity: Number(tierForm.total_capacity) }),
        });
        if (res.ok) { alert('Tier added successfully.'); fetchEvents(); }
    };

    const totalTicketsSold = events.reduce((acc, ev) => acc + (ev.tiers?.reduce((tAcc, t) => tAcc + Number(t.quantity_sold || 0), 0) || 0), 0);
    const totalRevenue = events.reduce((acc, ev) => acc + (ev.tiers?.reduce((tAcc, t) => tAcc + (Number(t.quantity_sold || 0) * Number(t.price || 0)), 0) || 0), 0);

    return (
        <main className="min-h-screen bg-[#050505] text-white p-6 md:p-12 font-sans relative">
            <div className="absolute top-0 left-0 w-full h-96 bg-purple-900/10 blur-[120px] pointer-events-none"></div>

            <div className="max-w-6xl mx-auto relative z-10">
                <div className="flex items-center justify-between mb-10 pb-6 border-b border-white/5">
                    <h1 className="text-2xl font-black tracking-tight">Event Dashboard</h1>
                    <Link href="/" className="text-xs font-semibold bg-white/5 border border-white/10 px-4 py-2 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 transition">Public Site →</Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 p-6 rounded-3xl"><p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Gross Revenue</p><p className="text-3xl font-black text-white mt-2">₦{totalRevenue.toLocaleString()}</p></div>
                    <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 p-6 rounded-3xl"><p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Tickets Sold</p><p className="text-3xl font-black text-white mt-2">{totalTicketsSold}</p></div>
                    <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 p-6 rounded-3xl"><p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Active Events</p><p className="text-3xl font-black text-white mt-2">{events.length}</p></div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                    <div className="bg-zinc-950/60 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
                        <h2 className="text-lg font-black tracking-tight mb-6">Publish Event</h2>
                        <form onSubmit={handleCreateEvent} className="space-y-4">
                            <input type="text" placeholder="Event Title" required onChange={e => setEventForm({ ...eventForm, title: e.target.value })} className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm focus:border-purple-500 outline-none transition text-white" />
                            <input type="text" placeholder="Venue & Address" required onChange={e => setEventForm({ ...eventForm, venue_name: e.target.value })} className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm focus:border-purple-500 outline-none transition text-white" />
                            <input type="datetime-local" required onChange={e => setEventForm({ ...eventForm, start_time: e.target.value })} className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm focus:border-purple-500 outline-none transition text-zinc-400" />
                            <button type="submit" className="w-full bg-white text-black font-bold py-3 rounded-xl text-sm mt-2 hover:bg-zinc-200 transition active:scale-[0.98]">Deploy Event</button>
                        </form>
                    </div>
                    <div className="bg-zinc-950/60 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
                        <h2 className="text-lg font-black tracking-tight mb-6">Create Ticket Tier</h2>
                        <form onSubmit={handleCreateTier} className="space-y-4">
                            <select value={tierForm.event_id} onChange={e => setTierForm({ ...tierForm, event_id: e.target.value })} className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm focus:border-purple-500 outline-none transition text-zinc-400">
                                <option value="">Select Event Database</option>
                                {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                            </select>
                            <input type="text" placeholder="Tier Name (e.g. VIP)" required onChange={e => setTierForm({ ...tierForm, name: e.target.value })} className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm focus:border-purple-500 outline-none transition text-white" />
                            <div className="grid grid-cols-2 gap-4">
                                <input type="number" placeholder="Price (₦)" required onChange={e => setTierForm({ ...tierForm, price: e.target.value })} className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm focus:border-purple-500 outline-none transition text-white" />
                                <input type="number" placeholder="Capacity" required onChange={e => setTierForm({ ...tierForm, total_capacity: e.target.value })} className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm focus:border-purple-500 outline-none transition text-white" />
                            </div>
                            <button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl text-sm mt-2 transition active:scale-[0.98]">Initialize Tier</button>
                        </form>
                    </div>
                </div>
            </div>
        </main>
    );
}