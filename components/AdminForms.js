'use client';

import { useState } from 'react';
import { movieAPI, showtimeAPI, screenAPI } from '../services/api';
import { Plus, X, Loader2 } from 'lucide-react';

export default function AdminForms({ genres, movies, screens, onUpdate }) {
    const [activeTab, setActiveTab] = useState(null); // 'movie', 'showtime', 'screen'
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // Forms state
    const [movieForm, setMovieForm] = useState({ name: '', genreId: '' });
    const [showtimeForm, setShowtimeForm] = useState({ movieId: '', screenId: '', datetime: '' });
    const [screenForm, setScreenForm] = useState({ name: '', capacity: 50 });

    const resetForms = () => {
        setMovieForm({ name: '', genreId: '' });
        setShowtimeForm({ movieId: '', screenId: '', datetime: '' });
        setScreenForm({ name: '', capacity: 50 });
        setMessage('');
        setError('');
    };

    const handleAddMovie = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');
        try {
            // Find genre name from genreId
            const genreObj = genres.find(g => g.id === movieForm.genreId);
            if (!genreObj) throw new Error("Please select a valid genre");

            const res = await movieAPI.addMovie(movieForm.name, genreObj.genre);
            if (res.success) {
                setMessage('Movie added successfully!');
                setMovieForm({ name: '', genreId: '' });
                onUpdate();
            } else {
                setError(res.message || 'Failed to add movie');
            }
        } catch (err) {
            setError(err.message || 'Error adding movie');
        } finally {
            setLoading(false);
        }
    };

    const handleAddShowtime = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');
        try {
            // Format date to ISO string
            const isoDateTime = new Date(showtimeForm.datetime).toISOString();
            const res = await showtimeAPI.addShowtime(showtimeForm.movieId, showtimeForm.screenId, isoDateTime);
            if (res.success) {
                setMessage('Showtime added successfully!');
                setShowtimeForm({ movieId: '', screenId: '', datetime: '' });
            } else {
                setError(res.message || 'Failed to add showtime');
            }
        } catch (err) {
            setError(err.message || 'Error adding showtime');
        } finally {
            setLoading(false);
        }
    };

    const handleAddScreen = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');
        try {
            const res = await screenAPI.addScreen(screenForm.name, Number(screenForm.capacity));
            if (res.success) {
                setMessage('Screen added successfully!');
                setScreenForm({ name: '', capacity: 50 });
                onUpdate();
            } else {
                setError(res.message || 'Failed to add screen');
            }
        } catch (err) {
            setError(err.message || 'Error adding screen');
        } finally {
            setLoading(false);
        }
    };

    if (!activeTab) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <button
                    onClick={() => setActiveTab('movie')}
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-xl shadow-md hover:shadow-lg transition-all"
                >
                    <Plus className="w-5 h-5" /> Add Movie
                </button>
                <button
                    onClick={() => setActiveTab('showtime')}
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-xl shadow-md hover:shadow-lg transition-all"
                >
                    <Plus className="w-5 h-5" /> Add Showtime
                </button>
                <button
                    onClick={() => setActiveTab('screen')}
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white p-4 rounded-xl shadow-md hover:shadow-lg transition-all"
                >
                    <Plus className="w-5 h-5" /> Add Screen
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border-2 border-gray-100">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">
                    {activeTab === 'movie' && 'Add New Movie'}
                    {activeTab === 'showtime' && 'Add New Showtime'}
                    {activeTab === 'screen' && 'Add New Screen'}
                </h3>
                <button
                    onClick={() => { setActiveTab(null); resetForms(); }}
                    className="text-gray-400 hover:text-gray-600"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            {(message || error) && (
                <div className={`p-4 rounded-lg mb-6 ${message ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message || error}
                </div>
            )}

            {activeTab === 'movie' && (
                <form onSubmit={handleAddMovie} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Movie Name</label>
                        <input
                            type="text"
                            required
                            value={movieForm.name}
                            onChange={e => setMovieForm({ ...movieForm, name: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="e.g. Inception"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Genre</label>
                        <select
                            required
                            value={movieForm.genreId}
                            onChange={e => setMovieForm({ ...movieForm, genreId: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Select Genre</option>
                            {genres.map(g => (
                                <option key={g.id} value={g.id}>{g.genre}</option>
                            ))}
                        </select>
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Add Movie'}
                    </button>
                </form>
            )}

            {activeTab === 'showtime' && (
                <form onSubmit={handleAddShowtime} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Movie</label>
                        <select
                            required
                            value={showtimeForm.movieId}
                            onChange={e => setShowtimeForm({ ...showtimeForm, movieId: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        >
                            <option value="">Select Movie</option>
                            {movies.map(m => (
                                <option key={m.id} value={m.id}>{m.movie}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Screen</label>
                        <select
                            required
                            value={showtimeForm.screenId}
                            onChange={e => setShowtimeForm({ ...showtimeForm, screenId: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        >
                            <option value="">Select Screen</option>
                            {screens.map(s => (
                                <option key={s.id} value={s.id}>{s.name} (Cap: {s.capacity})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
                        <input
                            type="datetime-local"
                            required
                            value={showtimeForm.datetime}
                            onChange={e => setShowtimeForm({ ...showtimeForm, datetime: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-purple-600 text-white py-2 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Add Showtime'}
                    </button>
                </form>
            )}

            {activeTab === 'screen' && (
                <form onSubmit={handleAddScreen} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Screen Name</label>
                        <input
                            type="text"
                            required
                            value={screenForm.name}
                            onChange={e => setScreenForm({ ...screenForm, name: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="e.g. Screen 1"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                        <input
                            type="number"
                            required
                            min="1"
                            value={screenForm.capacity}
                            onChange={e => setScreenForm({ ...screenForm, capacity: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Add Screen'}
                    </button>
                </form>
            )}
        </div>
    );
}
