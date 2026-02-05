import { useState, useEffect } from 'react';
import { Film, Star, ChevronRight } from 'lucide-react';
import Header from './Headers';
import AdminForms from './AdminForms';
import { screenAPI } from '../services/api';

export default function HomePage({ user, movies, genres, onLogout, onNavigateAuth, onMovieSelect }) {
  const [screens, setScreens] = useState([]);

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

  const getGenreName = (genreId) => {
    const genre = genres.find(g => g.id === genreId);
    return genre ? genre.genre : 'Unknown';
  };

  const handleDataUpdate = () => {
    // Ideally we should reload movies/genres here from parent or simple reload
    // For now simple reliable way: 
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        user={user}
        onLogout={onLogout}
        onNavigateHome={() => { }}
        onNavigateAuth={onNavigateAuth}
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

        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Now Showing</h2>
          <p className="text-gray-600">Book tickets for the latest movies</p>
        </div>

        {movies.length === 0 ? (
          <div className="text-center py-12">
            <Film className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No movies available at the moment</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {movies.map((movie) => (
              <div
                key={movie.id}
                onClick={() => onMovieSelect(movie)}
                className="bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer transform hover:scale-105 transition-all duration-300 hover:shadow-2xl"
              >
                <div className="bg-gradient-to-br from-red-500 to-pink-500 h-64 flex items-center justify-center">
                  <Film className="w-24 h-24 text-white/30" />
                </div>

                <div className="p-4">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{movie.movie}</h3>
                  <div className="flex items-center justify-between">
                    <span className="inline-block bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-medium">
                      {getGenreName(movie.genreId)}
                    </span>
                    {movie.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-semibold">{movie.rating}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-gray-600">Book Now</span>
                    <ChevronRight className="w-5 h-5 text-red-600" />
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