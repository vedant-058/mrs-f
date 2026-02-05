import { API_BASE_URL } from '../utils/constants';

// Helper function to get auth token
const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

// Helper function to make API calls
const apiCall = async (endpoint, options = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;
  console.log(`API Call: ${options.method || 'GET'} ${url}`);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    console.log(`Response status: ${response.status} for ${url}`);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
      }
      console.error('API Error:', errorData);
      throw new Error(errorData.message || `Request failed with status ${response.status}`);
    }

    const data = await response.json();
    console.log(`API Success for ${url}:`, data);
    return data;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('Network error - Backend might not be running or CORS issue:', error);
      throw new Error('Cannot connect to backend. Please ensure the server is running on http://localhost:8080');
    }
    throw error;
  }
};

// Auth API
export const authAPI = {
  signup: async (username, email, password) => {
    return apiCall('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
  },

  login: async (email, password) => {
    return apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  logout: async () => {
    // Note: According to API docs, logout might need email/password, but we'll try without first
    // If it fails, we'll still clear local storage
    try {
      return await apiCall('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({}), // Empty body, token in header should be enough
      });
    } catch (error) {
      // Even if logout API fails, we should still clear local storage
      console.warn('Logout API call failed, but clearing local storage anyway:', error);
      throw error; // Re-throw so caller can handle it
    }
  },
};

// Genre API
export const genreAPI = {
  getGenres: async () => {
    return apiCall('/genre/get-genre');
  },

  addGenre: async (genre) => {
    return apiCall('/genre/add-genre', {
      method: 'POST',
      body: JSON.stringify({ Genre: genre }),
    });
  },
};

// Movie API
export const movieAPI = {
  getMovies: async () => {
    return apiCall('/movies/get-movies');
  },

  addMovie: async (name, genre) => {
    return apiCall('/movies/add-movie', {
      method: 'POST',
      body: JSON.stringify({ name, genre }),
    });
  },
};

// Showtime API
// Showtime API
export const showtimeAPI = {
  getShowtimes: async () => {
    return apiCall('/showtime/get-showtimes');
  },
  // ✅ FIXED: Use the booking API endpoint
  getBookedSeats: async (showtimeId) => {
    return apiCall(`/booking/get-booked-seats-by-showtimeId/${showtimeId}`);
  },
  getSeatsByShowtime: async (showtimeId) => {
    return apiCall(`/showtime/get-seats/${showtimeId}`);
  },
  // ✅ FIXED: Use the booking API endpoint
  getAvailableSeats: async (showtimeId) => {
    return apiCall(`/booking/available-seats/${showtimeId}`);
  },
  addShowtime: async (movieId, screenId, showtime) => {
    return apiCall('/showtime/add-showtime', {
      method: 'POST',
      body: JSON.stringify({ movieId, screenId, showtime }),
    });
  },
  getById: async (id) => {
    return apiCall(`/showtime/${id}`);
  }
};

// Booking API
export const bookingAPI = {
  // Keep this for reference, but showtimeAPI.getBookedSeats now uses correct endpoint
  getBookedSeatsByShowtimeId: async (showtimeId) => {
    return apiCall(`/booking/get-booked-seats-by-showtimeId/${showtimeId}`);
  },
};

// Seat API
export const seatAPI = {
  getSeats: async () => {
    return apiCall('/seat/get-seats');
  },

  getSeatsByScreen: async (screenId) => {
    return apiCall(`/seat/get-seats/${screenId}`);
  },

  addSeat: async (screenId, row_number, seat_number, xPos, yPos) => {
    return apiCall('/seat/add-seat', {
      method: 'POST',
      body: JSON.stringify({ screenId, row_number, seat_number, xPos, yPos }),
    });
  },

  lockSeats: async (seatIds, showtimeId, userId) => {
    return apiCall('/booking/lock-seats', {
      method: 'POST',
      body: JSON.stringify({ seatIds, showtimeId, userId }),
    });
  },

  confirmBooking: async (seatIds, showtimeId, userId) => {
    return apiCall('/booking/confirm', {
      method: 'POST',
      body: JSON.stringify({ seatIds, showtimeId, userId }),
    });
  },

  releaseSeats: async (seatIds, showtimeId, userId) => {
    return apiCall('/booking/release-seats', {
      method: 'POST',
      body: JSON.stringify({ seatIds, showtimeId, userId }),
    });
  },
};

// Screen API
export const screenAPI = {
  getScreens: async () => {
    return apiCall('/screen/get-screens');
  },

  addScreen: async (name, capacity) => {
    return apiCall('/screen/add-screen', {
      method: 'POST',
      body: JSON.stringify({ name, capacity }),
    });
  },
};


// Reservation API
export const reservationAPI = {
  getReservations: async () => {
    return apiCall('/reservation/get-reservations');
  },

  addReservation: async (userId, showtimeId, amount) => {
    return apiCall('/reservation/add-reservation', {
      method: 'POST',
      body: JSON.stringify({ userId, showtimeId, amount }),
    });
  },
};
