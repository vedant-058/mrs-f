'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Calendar, Clock, ChevronRight } from 'lucide-react';
import Header from '../../../../components/Headers';
import { useAuth } from '../../../../contexts/AuthContext';
import { movieAPI, genreAPI, showtimeAPI } from '../../../../services/api';

interface Movie {
    id: string;
    movie: string;
    genreId: string;
    rating?: number | null;
}

interface Genre {
    id: string;
    genre: string;
}

interface Showtime {
    id: string;
    movieId: string;
    screenId: string;
    showtime: string;
}

export default function ShowtimesPage() {
    const router = useRouter();
    const params = useParams();
    const movieId = params.movieId as string;
    const { user, loading: authLoading, logout } = useAuth();

    const [movie, setMovie] = useState<Movie | null>(null);
    const [genres, setGenres] = useState<Genre[]>([]);
    const [showtimes, setShowtimes] = useState<Showtime[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth');
            return;
        }

        if (movieId && user) {
            loadData();
        }
    }, [movieId, user, authLoading]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [moviesRes, genresRes, showtimesRes] = await Promise.all([
                movieAPI.getMovies(),
                genreAPI.getGenres(),
                showtimeAPI.getShowtimes(),
            ]);

            if (moviesRes.success) {
                const foundMovie = (moviesRes.data || []).find((m: Movie) => m.id === movieId);
                setMovie(foundMovie || null);
            }

            if (genresRes.success) {
                setGenres(genresRes.data?.genre || []);
            }

            if (showtimesRes.success) {
                const movieShowtimes = ((showtimesRes.data || []) as Showtime[]).filter(
                    (st: Showtime) => st.movieId === movieId
                );
                setShowtimes(movieShowtimes);
            }
        } catch (err) {
            setError('Failed to load data');
            console.error('Error loading data:', err);
        } finally {
            setLoading(false);
        }
    };

    const getGenreName = (genreId: string) => {
        const genre = genres.find(g => g.id === genreId);
        return genre ? genre.genre : 'Unknown';
    };

    const handleShowtimeSelect = (showtime: Showtime) => {
        router.push(`/showtime/${showtime.id}/seats`);
    };

    const handleLogout = async () => {
        await logout();
        router.push('/');
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-red-600">{error}</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header
                user={user}
                onLogout={handleLogout}
                onNavigateHome={() => router.push('/')}
                onNavigateAuth={() => router.push('/auth')}
            />

            <div className="max-w-7xl mx-auto px-4 py-8">
                <button
                    onClick={() => router.back()}
                    className="mb-6 text-red-600 hover:text-red-700 font-medium flex items-center gap-2"
                >
                    ← Back to Movies
                </button>

                <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">{movie?.movie}</h2>
                    <span className="inline-block bg-red-100 text-red-600 px-4 py-2 rounded-full text-sm font-medium">
                        {getGenreName(movie?.genreId || '')}
                    </span>
                </div>

                <h3 className="text-2xl font-bold text-gray-800 mb-6">Select Showtime</h3>

                {showtimes.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-md p-8 text-center">
                        <p className="text-gray-600">No showtimes available for this movie</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {showtimes.map((showtime) => (
                            <div
                                key={showtime.id}
                                onClick={() => handleShowtimeSelect(showtime)}
                                className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-xl transition-all border-2 border-transparent hover:border-red-500"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-2 text-gray-700">
                                            <Calendar className="w-5 h-5 text-red-600" />
                                            <span className="font-medium">
                                                {new Date(showtime.showtime).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-700">
                                            <Clock className="w-5 h-5 text-red-600" />
                                            <span className="font-medium">
                                                {new Date(showtime.showtime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-6 h-6 text-red-600" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
