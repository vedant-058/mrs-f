'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Ticket } from 'lucide-react';
import Header from '../../../../components/Headers';
import { useAuth } from '../../../../contexts/AuthContext';
import { showtimeAPI, seatAPI, bookingAPI } from '../../../../services/api';
import { SEAT_PRICE, SEAT_STATUS, LOCK_TIMEOUT } from '../../../../utils/constants';

interface Seat {
    id: string;
    seatId?: string;
    screenId: string;
    rowNumber: string;
    seatNumber: number;
    xPos: number;
    yPos: number;
    status?: string;
}

interface AvailableSeat {
    seatId: string;
    showtimeId: string;
    status: string;
    userId: string | null;
}

interface DisplaySeat {
    seatId: string;
    status: string;
    rowNumber: string;
    seatNumber: number;
    xPos: number;
    yPos: number;
}

export default function SeatsPage() {
    const router = useRouter();
    const params = useParams();
    const showtimeId = params.showtimeId as string;
    const { user, loading: authLoading, logout } = useAuth();

    const [seats, setSeats] = useState<DisplaySeat[]>([]);
    const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
    const [lockedSeats, setLockedSeats] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth');
            return;
        }
    
        if (!showtimeId || !user) return;
    
        // Initial load
        loadSeats();
    
        // 🔄 Reload seats when user returns to the tab/window
        const handleFocus = () => {
            console.log('🔄 Page focused, reloading seats...');
            loadSeats();
        };
    
        // 🔄 Auto-refresh seats every 10 seconds for real-time updates
        const interval = setInterval(() => {
            console.log('🔄 Auto-refreshing seats...');
            loadSeats();
        }, 10000); // 10 seconds
    
        window.addEventListener('focus', handleFocus);
    
        return () => {
            window.removeEventListener('focus', handleFocus);
            clearInterval(interval);
        };
    }, [showtimeId, user, authLoading]);

    const loadSeats = async () => {
        try {
            setIsRefreshing(true);
            setLoading(true);
            
            const [seatsRes, bookedRes, availableRes] = await Promise.all([
                showtimeAPI.getSeatsByShowtime(showtimeId),
                bookingAPI.getBookedSeatsByShowtimeId(showtimeId),
                showtimeAPI.getAvailableSeats(showtimeId),
            ]);
    
            if (!seatsRes.success) {
                setError('Could not load seats for this showtime.');
                return;
            }
    
            const allSeats = (seatsRes.data || []) as Seat[];
            const bookedSeatsData = bookedRes.success ? ((bookedRes.data || []) as AvailableSeat[]) : [];
            const availableSeatsData = availableRes.success ? ((availableRes.data || []) as AvailableSeat[]) : [];
    
            const bookedSeatMap = new Map(
                bookedSeatsData.map((b: AvailableSeat) => [b.seatId, b])
            );
            const availableSeatMap = new Map(
                availableSeatsData.map((a: AvailableSeat) => [a.seatId, a])
            );
    
            console.log('🔍 Booked seats:', bookedSeatsData);
            console.log('🔍 Available seats:', availableSeatsData);
            console.log('🔍 Current user:', user?.userId || user?.id);
    
            // ✅ FIX: Properly handle LOCKED vs BOOKED status
            const mergedSeats: DisplaySeat[] = allSeats.map((seat: Seat) => {
                const seatId = seat.id;
                let status = SEAT_STATUS.AVAILABLE;
    
                // Check booked seats first
                const bookedSeat = bookedSeatMap.get(seatId);
                
                if (bookedSeat) {
                    // If it's LOCKED, check who locked it
                    if (bookedSeat.status === 'LOCKED') {
                        // If locked by another user, show as LOCKED
                        if (bookedSeat.userId !== (user?.userId || user?.id)) {
                            status = SEAT_STATUS.LOCKED;
                        } else {
                            // If locked by current user, treat as AVAILABLE
                            // (they might have backed out from payment)
                            status = SEAT_STATUS.AVAILABLE;
                        }
                    } 
                    // If it's BOOKED, it's definitely booked
                    else if (bookedSeat.status === 'BOOKED') {
                        status = SEAT_STATUS.BOOKED;
                    }
                }
                // If not in booked list, check available list
                else if (availableSeatMap.has(seatId)) {
                    const availSeat = availableSeatMap.get(seatId);
                    status = availSeat?.status || SEAT_STATUS.AVAILABLE;
                }
    
                return {
                    seatId: seatId,
                    status: status,
                    rowNumber: seat.rowNumber,
                    seatNumber: seat.seatNumber,
                    xPos: seat.xPos ?? 0,
                    yPos: seat.yPos ?? 0,
                };
            });
    
            console.log('✅ Merged seats with status:', mergedSeats);
            setSeats(mergedSeats);
        } catch (err) {
            setError('Failed to load seats');
            console.error('Error loading seats:', err);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };
    const handleSeatToggle = (seatId: string) => {
        setSelectedSeats(prev => {
            if (prev.includes(seatId)) {
                return prev.filter(id => id !== seatId);
            } else {
                return [...prev, seatId];
            }
        });
    };

    const handleBooking = async () => {
        if (!user || selectedSeats.length === 0) return;

        setLoading(true);
        setError('');

        try {
            // ONLY lock the seats
            const lockRes = await seatAPI.lockSeats(
                selectedSeats,
                showtimeId,
                user?.userId || user?.id
            );

            if (lockRes.success) {
                setLockedSeats(selectedSeats);
                
                // Store data in sessionStorage before navigation
                sessionStorage.setItem('paymentData', JSON.stringify({
                    seatIds: selectedSeats,
                    showtimeId: showtimeId,
                    seats: seats.filter(s => selectedSeats.includes(s.seatId)),
                    lockedAt: Date.now()
                }));
                
                // Navigate to payment page
                router.push(`/payment/${showtimeId}?seats=${selectedSeats.join(',')}`);
            } else {
                throw new Error('Failed to lock seats');
            }
        } catch (err: unknown) {
            const errorMessage = (err as Error).message || 'Booking failed. Please try again.';
            setError(errorMessage);
            alert(`Failed to lock seats: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        router.push('/');
    };

    // Group seats by row
    const getSeatsByRow = () => {
        const rows: { [key: string]: DisplaySeat[] } = {};
        seats.forEach(seat => {
            if (!rows[seat.rowNumber]) {
                rows[seat.rowNumber] = [];
            }
            rows[seat.rowNumber].push(seat);
        });
        Object.keys(rows).forEach(row => {
            rows[row].sort((a, b) => a.seatNumber - b.seatNumber);
        });
        return rows;
    };

    const getSeatClass = (seat: DisplaySeat) => {
        if (seat.status === SEAT_STATUS.BOOKED) {
            return 'bg-red-500/40 cursor-not-allowed border border-red-600 opacity-60';
        }
        if (seat.status === SEAT_STATUS.LOCKED) {
            return 'bg-gray-400 cursor-not-allowed opacity-50';
        }
        if (selectedSeats.includes(seat.seatId)) {
            return 'bg-yellow-400 hover:bg-yellow-500';
        }
        if (lockedSeats.includes(seat.seatId)) {
            return 'bg-yellow-500';
        }
        return 'bg-green-500/50 hover:bg-green-500/70 cursor-pointer border border-green-600';
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            </div>
        );
    }

    const seatsByRow = getSeatsByRow();
    const totalPrice = selectedSeats.length * SEAT_PRICE;

    return (
        <div className="min-h-screen bg-gray-50">
            <Header
                user={user}
                onLogout={handleLogout}
                onNavigateHome={() => router.push('/')}
                onNavigateAuth={() => router.push('/auth')}
            />

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* ✅ Add this refresh indicator */}
                {isRefreshing && !loading && (
                    <div className="fixed top-20 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50 animate-fade-in">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        Refreshing seats...
                    </div>
                )}

                <button
                    onClick={() => router.back()}
                    className="mb-6 text-red-600 hover:text-red-700 font-medium flex items-center gap-2"
                >
                    ← Back to Showtimes
                </button>


                {error && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                        {error}
                    </div>
                )}

                {/* Screen */}
                <div className="mb-8">
                    <div className="bg-gray-800 text-white text-center py-2 rounded-t-lg">
                        SCREEN
                    </div>
                    <div className="h-4 bg-gradient-to-b from-gray-400 to-transparent"></div>
                </div>

                {/* Seats */}
                <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                    <div className="space-y-3">
                        {Object.keys(seatsByRow).sort().map(row => (
                            <div key={row} className="flex items-center gap-2">
                                <span className="w-8 text-center font-bold text-gray-600">{row}</span>
                                <div className="flex gap-2 flex-wrap">
                                    {seatsByRow[row].map(seat => (
                                        <button
                                            key={seat.seatId}
                                            onClick={() => 
                                                (seat.status === SEAT_STATUS.AVAILABLE) && 
                                                handleSeatToggle(seat.seatId)
                                            }
                                            disabled={seat.status !== SEAT_STATUS.AVAILABLE}
                                            className={`w-8 h-8 rounded text-white text-xs font-bold transition ${getSeatClass(seat)}`}
                                            title={`Row ${seat.rowNumber}, Seat ${seat.seatNumber}`}
                                        >
                                            {seat.seatNumber}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Legend */}
                    <div className="flex gap-6 mt-6 justify-center text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-green-500 rounded"></div>
                            <span>Available</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-yellow-500 rounded"></div>
                            <span>Selected</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-red-400 rounded"></div>
                            <span>Booked</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-gray-400 rounded"></div>
                            <span>Locked</span>
                        </div>
                    </div>
                </div>

                {/* Booking Summary */}
                {selectedSeats.length > 0 && (
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800">Booking Summary</h3>
                                <p className="text-gray-600">
                                    {selectedSeats.length} seat(s) selected
                                </p>
                                <p className="text-2xl font-bold text-red-600 mt-2">
                                    ₹{totalPrice}
                                </p>
                            </div>
                            <button
                                onClick={handleBooking}
                                disabled={loading}
                                className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-pink-600 text-white px-8 py-4 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50"
                            >
                                <Ticket className="w-5 h-5" />
                                {loading ? 'Processing...' : 'Confirm Booking'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
