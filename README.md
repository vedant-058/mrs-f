# MovieHub - Movie Booking Frontend

A modern, responsive movie booking application built with Next.js, React, and Tailwind CSS.

## Features

- 🎬 Browse movies by genre
- 🎫 Select showtimes for movies
- 💺 Interactive seat selection
- 🔒 Seat locking mechanism (10-minute timeout)
- ✅ Booking confirmation
- 👤 User authentication (Login/Signup)
- 🎨 Modern, responsive UI

## Tech Stack

- **Next.js 14** - React framework
- **React 18** - UI library
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
bookshow/
├── app/
│   ├── layout.tsx       # Root layout
│   ├── page.tsx         # Main application orchestrator
│   └── globals.css      # Global styles
├── components/
│   ├── AuthPage.js      # Login/Signup page
│   ├── Homepage.js      # Movie listing page
│   ├── Headers.js       # Navigation header
│   ├── ShowtimesPage.js # Showtime selection page
│   └── SeatsPage.js     # Seat selection page
├── services/
│   └── api.js           # API service layer
└── utils/
    ├── constants.js     # App constants
    └── helpers.js       # Utility functions
```

## API Integration

The frontend integrates with the following backend endpoints:

### Authentication
- `POST /auth/signup` - User registration
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout

### Movies & Genres
- `GET /movies/get-movies` - Fetch all movies
- `GET /genre/get-genre` - Fetch all genres

### Showtimes
- `GET /showtime/get-showtimes` - Fetch all showtimes
- `POST /showtime/add-showtime` - Add new showtime

### Seats
- `GET /seat/get-seats` - Fetch all seats
- `GET /available-seats/{showtimeId}` - Get available seats for a showtime
- `POST /lock-seats` - Lock selected seats
- `POST /confirm` - Confirm booking
- `POST /release-seats` - Release locked seats

### Reservations
- `GET /reservation/get-reservations` - Fetch reservations
- `POST /reservation/add-reservation` - Create reservation

## User Flow

1. **Home Page**: Browse available movies
2. **Authentication**: Login/Signup required to book tickets
3. **Showtimes**: Select a showtime for the chosen movie
4. **Seat Selection**: Choose seats from the interactive seat map
5. **Booking**: Lock seats → Confirm booking → Get reservation ID

## Seat Locking Mechanism

- When seats are selected and user clicks "Proceed to Pay", seats are locked for 10 minutes
- If booking is not confirmed within 10 minutes, seats are automatically released
- Once confirmed, seats are permanently booked

## Environment Variables

- `NEXT_PUBLIC_API_BASE_URL` - Backend API base URL (default: http://localhost:8080)

## Build for Production

```bash
npm run build
npm start
```

## License

MIT
