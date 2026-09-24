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

function formatDate(iso) {
    if (!iso) return 'Date TBA';
    return new Date(iso).toLocaleString('en-NG', {
        weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
    });
}

const CATEGORIES = ['Party', 'Concert', 'Conference', 'Workshop', 'Sports', 'Other'];

const EMPTY_EVENT_FORM = { title: '', description: '', category: 'Party', venue_name: '', city: 'Port Harcourt', start_time: '' };
const EMPTY_TIER_FORM = { name: '', description: '', price: '', total_capacity: '' };

export default function EventsPage() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    const [createOpen, setCreateOpen] = useState(false);
    const [eventForm, setEventForm] = useState(EMPTY_EVENT_FORM);
    const [creatingEvent, setCreatingEvent] = useState(false);
    const [createError, setCreateError] = useState('');

    const [tierOpenFor, setTierOpenFor] = useState(null); // event id currently adding a tier
    const [tierForm, setTierForm] = useState(EMPTY_TIER_FORM);
    const [creatingTier, setCreatingTier] = useState(false);
    const [tierError, setTierError] = useState('');

    const loadEvents = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        try {
            const res = await apiFetch('/api/v1/events/mine');
            setEvents(res.data || []);
        } catch (err) {
            setLoadError(err.message || "Couldn't load your events.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadEvents();
    }, [loadEvents]);

    async function handleCreateEvent(e) {
        e.preventDefault();
        setCreateError('');
        if (!eventForm.title || !eventForm.venue_name || !eventForm.start_time) {
            setCreateError('Title, venue and start time are required.');
            return;
        }
        setCreatingEvent(true);
        try {
            await apiFetch('/api/v1/events', {
                method: 'POST',
                body: JSON.stringify(eventForm),
            });
            setEventForm(EMPTY_EVENT_FORM);
            setCreateOpen(false);
            await loadEvents();
        } catch (err) {
            setCreateError(err.message || 'Failed to publish event.');
        } finally {
            setCreatingEvent(false);
        }
    }

    function openTierForm(eventId) {
        setTierOpenFor(eventId);
        setTierForm(EMPTY_TIER_FORM);
        setTierError('');
    }

    async function handleCreateTier(e, eventId) {
        e.preventDefault();
        setTierError('');
        if (!tierForm.name || !tierForm.price || !tierForm.total_capacity) {
            setTierError('Name, price and capacity are required.');
            return;
        }
        setCreatingTier(true);
        try {
            await apiFetch(`/api/v1/events/${eventId}/tiers`, {
                method: 'POST',
                body: JSON.stringify({
                    ...tierForm,
                    price: Number(tierForm.price),
                    total_capacity: Number(tierForm.total_capacity),
                }),
            });
            setTierOpenFor(null);
            await loadEvents();
        } catch (err) {
            setTierError(err.message || 'Failed to add ticket tier.');
        } finally {
            setCreatingTier(false);
        }
    }

    return (
        <main className="min-h-screen bg-[#050505] text-white p-6 md:p-12 font-sans relative">
            <div className="absolute top-0 left-0 w-full h-96 bg-purple-900/10 blur-[120px] pointer-events-none"></div>

            <div className="max-w-5xl mx-auto relative z-10">
                <div className="flex items-center justify-between mb-10 pb-6 border-b border-white/5">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight">Events</h1>
                        <p className="text-zinc-500 text-xs mt-1 font-medium">Publish events and manage their ticket tiers.</p>
                    </div>
                    <button
                        onClick={() => setCreateOpen((v) => !v)}
                        className="bg-white text-black font-bold py-3 px-6 rounded-xl text-sm hover:bg-zinc-200 transition active:scale-[0.98]"
                    >
                        {createOpen ? 'Cancel' : '+ New Event'}
                    </button>
                </div>

                {/* Create event form */}
                {createOpen && (
                    <form onSubmit={handleCreateEvent} className="bg-zinc-950/60 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl mb-10 space-y-4">
                        <h2 className="text-lg font-black tracking-tight mb-2">Publish Event</h2>

                        <input
                            type="text"
                            placeholder="Event Title"
                            value={eventForm.title}
                            onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                            className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm text-white outline-none focus:border-purple-500 transition"
                        />

                        <textarea
                            placeholder="Description"
                            rows={3}
                            value={eventForm.description}
                            onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                            className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm text-white outline-none focus:border-purple-500 transition resize-none"
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <select
                                value={eventForm.category}
                                onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })}
                                className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm text-zinc-300 outline-none focus:border-purple-500 transition"
                            >
                                {CATEGORIES.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>

                            <input
                                type="text"
                                placeholder="City"
                                value={eventForm.city}
                                onChange={(e) => setEventForm({ ...eventForm, city: e.target.value })}
                                className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm text-white outline-none focus:border-purple-500 transition"
                            />
                        </div>

                        <input
                            type="text"
                            placeholder="Venue & Address"
                            value={eventForm.venue_name}
                            onChange={(e) => setEventForm({ ...eventForm, venue_name: e.target.value })}
                            className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm text-white outline-none focus:border-purple-500 transition"
                        />

                        <input
                            type="datetime-local"
                            value={eventForm.start_time}
                            onChange={(e) => setEventForm({ ...eventForm, start_time: e.target.value })}
                            className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm text-zinc-400 outline-none focus:border-purple-500 transition"
                        />

                        {createError && <p className="text-rose-400 text-xs font-medium">{createError}</p>}

                        <button
                            type="submit"
                            disabled={creatingEvent}
                            className="w-full bg-white text-black font-bold py-3 rounded-xl text-sm hover:bg-zinc-200 transition active:scale-[0.98] disabled:opacity-50"
                        >
                            {creatingEvent ? 'Publishing...' : 'Deploy Event'}
                        </button>
                    </form>
                )}

                {/* Events list */}
                {loading ? (
                    <p className="text-zinc-500 text-sm">Loading your events...</p>
                ) : loadError ? (
                    <div className="bg-rose-950/40 border border-rose-500/30 rounded-3xl p-6">
                        <p className="text-rose-400 text-sm font-medium">{loadError}</p>
                        <button onClick={loadEvents} className="mt-3 text-xs font-bold text-purple-400 hover:text-purple-300 transition">
                            Try again
                        </button>
                    </div>
                ) : events.length === 0 ? (
                    <div className="bg-zinc-950/60 backdrop-blur-xl border border-white/10 rounded-3xl p-10 text-center">
                        <p className="text-zinc-400 text-sm">You haven&apos;t published any events yet.</p>
                        <button
                            onClick={() => setCreateOpen(true)}
                            className="mt-4 text-xs font-bold text-purple-400 hover:text-purple-300 transition"
                        >
                            + Publish your first event
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {events.map((ev) => {
                            const tiers = ev.tiers || [];
                            const sold = tiers.reduce((acc, t) => acc + Number(t.quantity_sold || 0), 0);
                            const capacity = tiers.reduce((acc, t) => acc + Number(t.total_capacity || 0), 0);

                            return (
                                <div key={ev.id} className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-3xl p-6">
                                    <div className="flex items-start justify-between gap-4 flex-wrap">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400">
                                                    {ev.category || 'Event'}
                                                </span>
                                                {ev.status && (
                                                    <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                                        {ev.status}
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="text-lg font-black text-white">{ev.title}</h3>
                                            <p className="text-xs text-zinc-500 mt-1">
                                                {ev.venue_name}{ev.city ? `, ${ev.city}` : ''} · {formatDate(ev.start_time)}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Sold</p>
                                            <p className="text-lg font-black text-white">{sold}{capacity > 0 ? ` / ${capacity}` : ''}</p>
                                        </div>
                                    </div>

                                    {/* Tiers */}
                                    <div className="mt-5 pt-5 border-t border-white/5 space-y-2">
                                        {tiers.length === 0 && (
                                            <p className="text-xs text-zinc-500">No ticket tiers yet.</p>
                                        )}
                                        {tiers.map((t) => (
                                            <div key={t.id} className="flex items-center justify-between bg-black/30 border border-white/5 rounded-xl px-4 py-3">
                                                <div>
                                                    <p className="text-sm font-bold text-white">{t.name}</p>
                                                    <p className="text-xs text-zinc-500">{t.quantity_sold || 0} / {t.total_capacity} sold</p>
                                                </div>
                                                <p className="text-sm font-black text-white">₦{Number(t.price).toLocaleString()}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {tierOpenFor === ev.id ? (
                                        <form onSubmit={(e) => handleCreateTier(e, ev.id)} className="mt-4 bg-black/40 border border-white/10 rounded-2xl p-5 space-y-3">
                                            <input
                                                type="text"
                                                placeholder="Tier Name (e.g. VIP)"
                                                value={tierForm.name}
                                                onChange={(e) => setTierForm({ ...tierForm, name: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-xl text-sm text-white outline-none focus:border-purple-500 transition"
                                            />
                                            <input
                                                type="text"
                                                placeholder="Description (optional)"
                                                value={tierForm.description}
                                                onChange={(e) => setTierForm({ ...tierForm, description: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-xl text-sm text-white outline-none focus:border-purple-500 transition"
                                            />
                                            <div className="grid grid-cols-2 gap-3">
                                                <input
                                                    type="number"
                                                    placeholder="Price (₦)"
                                                    value={tierForm.price}
                                                    onChange={(e) => setTierForm({ ...tierForm, price: e.target.value })}
                                                    className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-xl text-sm text-white outline-none focus:border-purple-500 transition"
                                                />
                                                <input
                                                    type="number"
                                                    placeholder="Capacity"
                                                    value={tierForm.total_capacity}
                                                    onChange={(e) => setTierForm({ ...tierForm, total_capacity: e.target.value })}
                                                    className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-xl text-sm text-white outline-none focus:border-purple-500 transition"
                                                />
                                            </div>

                                            {tierError && <p className="text-rose-400 text-xs font-medium">{tierError}</p>}

                                            <div className="flex gap-3">
                                                <button
                                                    type="submit"
                                                    disabled={creatingTier}
                                                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition active:scale-[0.98] disabled:opacity-50"
                                                >
                                                    {creatingTier ? 'Adding...' : 'Add Tier'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setTierOpenFor(null)}
                                                    className="text-xs font-bold text-zinc-500 hover:text-zinc-300 transition"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </form>
                                    ) : (
                                        <button
                                            onClick={() => openTierForm(ev.id)}
                                            className="mt-4 text-xs font-bold text-purple-400 hover:text-purple-300 transition"
                                        >
                                            + Add Ticket Tier
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </main>
    );
}