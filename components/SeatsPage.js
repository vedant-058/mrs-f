'use client';
import { Ticket } from 'lucide-react';
import Header from './Headers';
import { SEAT_PRICE, SEAT_STATUS } from '../utils/constants';

export default function SeatsPage({
  user,
  seats,
  selectedSeats,
  onLogout,
  onNavigateAuth,
  onNavigateShowtimes,
  onSeatToggle,
  onBooking
}) {
  // Group seats by row
  const seatsByRow = seats.reduce((acc, seat) => {
    const row = seat.rowNumber ?? seat.row_number ?? (seat.seatId ? String(seat.seatId).substring(0, 1) : 'A');
    if (!acc[row]) acc[row] = [];
    acc[row].push(seat);
    return acc;
  }, {});

  // Sort rows by yPos
// Sort rows alphabetically (A, B, C, etc.)
  const rowKeys = Object.keys(seatsByRow).sort((a, b) => String(a).localeCompare(String(b)));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <Header 
        user={user} 
        onLogout={onLogout}
        onNavigateShowtimes={() => {}}
        onNavigateAuth={onNavigateAuth}
      />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <button
          onClick={onNavigateShowtimes}
          className="mb-6 text-blue-400 hover:text-blue-300 flex items-center gap-2 transition-colors"
        >
          ← Back to Showtimes
        </button>

        <h1 className="text-3xl font-bold mb-8 text-center">Select Your Seats</h1>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-6 mb-8 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-500/50 border border-green-600 rounded" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-400 rounded" />
            <span>Locked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-red-500/40 border border-red-600 rounded" />
            <span>Booked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-yellow-400 rounded" />
            <span>Selected</span>
          </div>
        </div>

        {/* Screen */}
        <div className="mb-12">
          <div className="w-full max-w-4xl mx-auto h-2 bg-gradient-to-r from-transparent via-gray-400 to-transparent rounded-full mb-2" />
          <p className="text-center text-gray-400 text-sm">Screen This Way</p>
        </div>

        {seats.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <Ticket className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>No seats available</p>
          </div>
        ) : (
          <div className="overflow-x-auto pb-4">
            <div className="inline-block min-w-full">
              <div className="flex flex-col items-center gap-4">
                {rowKeys.map((row) => {
                  const rowSeats = [...seatsByRow[row]].sort(
                    (a, b) => (a.seatNumber ?? a.seat_number ?? 0) - (b.seatNumber ?? b.seat_number ?? 0)
                  );

                  // Calculate max position to create grid
                  const maxPos = Math.max(...rowSeats.map(s => s.x_pos ?? s.xPos ?? 0));

                  // Create array of positions to render (including gaps)
                  const positions = Array.from({ length: maxPos + 1 }, (_, i) => i);

                  return (
                    <div key={row} className="flex items-center gap-4 mb-2"> {/* Added mb-2 for consistent row spacing */}
                      {/* Row Label */}
                      <div className="w-10 font-bold text-gray-400 text-center flex-shrink-0 text-lg">
                        {row}
                      </div>

                      {/* Seats with proper positioning and gaps */}
                      <div className="flex items-center gap-2">
                        {positions.map((pos) => {
                          // Find seat at this position
                          // Find seat at this position
                          const seat = rowSeats.find(s => {
                            const seatPos = s.x_pos ?? s.xPos ?? 0;  // Only use x_pos/xPos, don't fall back to seat_number
                            return seatPos === pos;
                          });

                          // If no seat at this position, render aisle gap
                          if (!seat) {
                            return (
                              <div
                                key={`gap-${row}-${pos}`}
                                className="flex flex-col items-center justify-center"
                                style={{
                                  width: 'clamp(40px, 5vw, 56px)',
                                  height: 'clamp(40px, 5vw, 56px)',
                                }}
                              >
                                <div className="border-l-2 border-dashed border-gray-600 h-full flex items-center">
                                  <span className="text-[10px] text-gray-500 rotate-90 whitespace-nowrap">
                                    AISLE
                                  </span>
                                </div>
                              </div>
                            );
                          }

                          // Render actual seat
                          return (
                            <button
                              key={seat.seatId ?? seat.id}
                              onClick={() =>
                                seat.status === SEAT_STATUS.AVAILABLE &&
                                onSeatToggle(seat.seatId ?? seat.id)
                              }
                              disabled={seat.status !== SEAT_STATUS.AVAILABLE}
                              className={`rounded-lg font-medium transition-all flex items-center justify-center ${
                                selectedSeats.includes(seat.seatId ?? seat.id)
                                  ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-500/50 scale-105'
                                  : seat.status === SEAT_STATUS.AVAILABLE
                                  ? 'bg-green-500/50 text-white hover:bg-green-500/70 border border-green-600 hover:scale-105'
                                  : seat.status === SEAT_STATUS.BOOKED
                                  ? 'bg-red-500/40 text-gray-200 cursor-not-allowed border border-red-600 opacity-60'
                                  : 'bg-gray-400 text-gray-700 cursor-not-allowed opacity-50'
                              }`}
                              style={{
                                width: 'clamp(40px, 5vw, 56px)',
                                height: 'clamp(40px, 5vw, 56px)',
                                fontSize: 'clamp(0.75rem, 1.8vw, 0.95rem)',
                              }}
                              title={`Row ${seat.rowNumber ?? seat.row_number} Seat ${seat.seatNumber ?? seat.seat_number} - ${seat.status}`}
                            >
                              {seat.seatNumber ?? seat.seat_number ?? seat.seatId?.substring(seat.seatId.length - 1) ?? ''}
                            </button>
                          );
                        })}
                      </div>

                      {/* Row Label on Right (optional) */}
                      <div className="w-10 font-bold text-gray-400 text-center flex-shrink-0 text-lg opacity-50">
                        {row}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Seat Selection Info */}
        <div className="mt-8 text-center text-sm text-gray-400">
          <p>💡 Click on available seats to select. Gaps represent aisles.</p>
        </div>

        {/* Booking Summary */}
        {selectedSeats.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-gray-800/95 backdrop-blur-sm border-t border-gray-700 p-4 shadow-2xl">
            <div className="container mx-auto max-w-7xl flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Selected Seats: {selectedSeats.length}</p>
                <p className="text-2xl font-bold text-yellow-400">Total: ₹{selectedSeats.length * SEAT_PRICE}</p>
              </div>
              <button
                onClick={onBooking}
                className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3 px-8 rounded-lg transition-all flex items-center gap-2 shadow-lg hover:shadow-yellow-500/50 hover:scale-105"
              >
                <Ticket className="w-5 h-5" />
                Proceed to Pay
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}