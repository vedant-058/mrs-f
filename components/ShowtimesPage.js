'use client';

import { Calendar, Clock, ChevronRight } from 'lucide-react';
import Header from './Headers';

export default function ShowtimesPage({ 
  user, 
  selectedMovie, 
  showtimes, 
  genres,
  onLogout, 
  onNavigateAuth,
  onNavigateHome,
  onShowtimeSelect 
}) {
  const getGenreName = (genreId) => {
    const genre = genres.find(g => g.id === genreId);
    return genre ? genre.genre : 'Unknown';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        user={user} 
        onLogout={onLogout} 
        onNavigateHome={onNavigateHome} 
        onNavigateAuth={onNavigateAuth} 
      />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <button
          onClick={onNavigateHome}
          className="mb-6 text-red-600 hover:text-red-700 font-medium flex items-center gap-2"
        >
          ← Back to Movies
        </button>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">{selectedMovie?.movie}</h2>
          <span className="inline-block bg-red-100 text-red-600 px-4 py-2 rounded-full text-sm font-medium">
            {getGenreName(selectedMovie?.genreId)}
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
                onClick={() => onShowtimeSelect(showtime)}
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
                        {new Date(showtime.showtime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
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