'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Film, Star } from 'lucide-react';
import Header from '../components/Headers';
import AdminForms from '../components/AdminForms';
import { useAuth } from '../contexts/AuthContext';
import { movieAPI, genreAPI, screenAPI } from '../services/api';

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

interface Screen {
  id: string;
  name: string;
  capacity: number;
}

export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();

  const [movies, setMovies] = useState<Movie[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      loadScreens();
    }
  }, [user]);

  const loadScreens = async () => {
    try {
      const res = await screenAPI.getScreens();
      if (res.success) {
        setScreens(res.data);
      }
    } catch (err) {
      console.error('Error loading screens:', err);
    }
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError('');

      const [moviesRes, genresRes] = await Promise.all([
        movieAPI.getMovies(),
        genreAPI.getGenres(),
      ]);

      if (moviesRes.success) {
        setMovies(moviesRes.data || []);
      }

      if (genresRes.success) {
        setGenres(genresRes.data?.genre || []);
      }
    } catch (err: unknown) {
      const errorMessage = (err as Error).message || 'Failed to load data';
      if (errorMessage.includes('CORS') || errorMessage.includes('fetch')) {
        setError(`CORS Error: Backend needs to allow requests from http://localhost:3000.`);
      } else {
        setError(`Failed to connect: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMovieSelect = (movie: Movie) => {
    if (!user) {
      router.push('/auth');
      return;
    }
    router.push(`/movie/${movie.id}/showtimes`);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleDataUpdate = () => {
    loadInitialData();
    if (user?.role === 'ADMIN') {
      loadScreens();
    }
  };

  const getGenreName = (genreId: string) => {
    const genre = genres.find(g => g.id === genreId);
    return genre ? genre.genre : 'Unknown';
  };

  if (loading && movies.length === 0 && !error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading movies...</p>
          <p className="text-sm text-gray-500 mt-2">Connecting to backend at http://localhost:8080...</p>
        </div>
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
        {user?.role === 'ADMIN' && (
          <AdminForms
            genres={genres}
            movies={movies}
            screens={screens}
            onUpdate={handleDataUpdate}
          />
        )}

        {error && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-yellow-700">{error}</p>
                <button
                  onClick={() => {
                    setError('');
                    loadInitialData();
                  }}
                  className="mt-2 text-sm text-yellow-800 underline"
                >
                  Retry Connection
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 mb-8">
          <Film className="w-8 h-8 text-red-600" />
          <h2 className="text-3xl font-bold text-gray-800">Now Showing</h2>
        </div>

        {movies.length === 0 && !error ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600">No movies available at the moment</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {movies.map((movie) => (
              <div
                key={movie.id}
                onClick={() => handleMovieSelect(movie)}
                className="bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer transform hover:scale-105 transition-all duration-300 hover:shadow-2xl"
              >
                <div className="h-48 bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center">
                  <Film className="w-20 h-20 text-white/80" />
                </div>
                <div className="p-4">
                  <h3 className="text-xl font-bold text-gray-800 mb-2 truncate">{movie.movie}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-sm bg-red-100 text-red-600 px-3 py-1 rounded-full">
                      {getGenreName(movie.genreId)}
                    </span>
                    {movie.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-medium">{movie.rating}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
