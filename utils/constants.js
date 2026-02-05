export const AUTH_MODES = {
  LOGIN: 'LOGIN',
  SIGNUP: 'SIGNUP'
};

export const SEAT_STATUS = {
  AVAILABLE: 'AVAILABLE',
  LOCKED: 'LOCKED',
  BOOKED: 'BOOKED'
};

export const SEAT_PRICE = 130; // Default seat price in rupees

export const LOCK_TIMEOUT = 10 * 60 * 1000; // 10 minutes in milliseconds

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';