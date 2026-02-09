'use client';

import { useEffect, useState, useRef } from 'react';
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

interface SeatUpdateEvent {
    seatIds: string[];
    showtimeId: string;
    status: 'AVAILABLE' | 'LOCKED' | 'BOOKED';
    eventType: 'LOCKED' | 'BOOKED' | 'RELEASED' | 'EXPIRED';
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
    const [notification, setNotification] = useState({ show: false, message: '' });
    const [isSSEConnected, setIsSSEConnected] = useState(false);

    const eventSourceRef = useRef<EventSource | null>(null);

    // 🔥 SSE Connection for Real-time Seat Updates
    useEffect(() => {
        if (!showtimeId) {
            console.warn('⚠️ No showtimeId, SSE disabled');
            return;
        }

        console.log('📡 Connecting to SSE for showtime:', showtimeId);

        // Connect to SSE endpoint
        const eventSource = new EventSource(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/booking/seat-status-stream/${showtimeId}`
        );
        eventSourceRef.current = eventSource;

        // Handle connection open
        eventSource.onopen = () => {
            console.log('✅ SSE connection established');
            setIsSSEConnected(true);
        };

        // Handle initial state
        eventSource.addEventListener('initial-state', (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('📡 Initial seat state received:', data);
                
                updateSeatsFromSSE(data.availableSeats, data.bookedSeats);
            } catch (error) {
                console.error('❌ Error parsing initial state:', error);
            }
        });

        // Handle real-time seat updates
        eventSource.addEventListener('seat-update', (event) => {
            try {
                const update: SeatUpdateEvent = JSON.parse(event.data);
                console.log('🔄 Seat update received:', update);
                
                handleSeatUpdate(update);
            } catch (error) {
                console.error('❌ Error parsing seat update:', error);
            }
        });

        // Handle connection errors
        eventSource.onerror = (error) => {
            console.error('❌ SSE connection error:', error);
            setIsSSEConnected(false);
            eventSource.close();
            
            // Attempt to reconnect after 3 seconds
            setTimeout(() => {
                console.log('🔄 Attempting to reconnect SSE...');
                // The useEffect will run again
            }, 3000);
        };

        // Cleanup on unmount
        return () => {
            console.log('🔌 Closing SSE connection');
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                setIsSSEConnected(false);
            }
        };
    }, [showtimeId]);

    // Initial load and fallback polling
// In SeatsPage component, modify the second useEffect:
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
            // ✅ Only reload if SSE is NOT connected
            if (!isSSEConnected) {
                console.log('🔄 Page focused (SSE disconnected), reloading seats...');
                loadSeats();
            } else {
                console.log('✅ SSE connected, relying on real-time updates');
            }
        };

        // 🔄 Fallback polling (only if SSE is not connected)
        const interval = setInterval(() => {
            if (!isSSEConnected) {
                console.log('🔄 SSE disconnected, using fallback polling...');
                loadSeats();
            }
        }, 10000);

        window.addEventListener('focus', handleFocus);

        return () => {
            window.removeEventListener('focus', handleFocus);
            clearInterval(interval);
        };
    }, [showtimeId, user, authLoading, isSSEConnected]);

    // Update seats from SSE initial state
    const updateSeatsFromSSE = (availableSeats: AvailableSeat[], bookedSeats: AvailableSeat[]) => {
        setSeats((currentSeats) => {
            return currentSeats.map((seat) => {
                const seatId = seat.seatId;
                
                // Check if seat is booked
                const bookedSeat = bookedSeats.find(b => b.seatId === seatId);
                if (bookedSeat) {
                    // If booked by someone else
                    if (bookedSeat.status === 'BOOKED') {
                        return { ...seat, status: SEAT_STATUS.BOOKED };
                    }
                    // If locked by someone else
                    if (bookedSeat.status === 'LOCKED' && bookedSeat.userId !== (user?.userId || user?.id)) {
                        return { ...seat, status: SEAT_STATUS.LOCKED };
                    }
                }
                
                // Check if seat is available
                const availableSeat = availableSeats.find(a => a.seatId === seatId);
                if (availableSeat) {
                    return { ...seat, status: SEAT_STATUS.AVAILABLE };
                }
                
                // Otherwise keep current status
                return seat;
            });
        });
    };

    // Handle real-time seat updates from SSE
    const handleSeatUpdate = (update: SeatUpdateEvent) => {
        const { seatIds, status, eventType } = update;
        
        setSeats((currentSeats) => {
            return currentSeats.map((seat) => {
                if (seatIds.includes(seat.seatId)) {
                    // Don't update seats that the current user has selected
                    if (selectedSeats.includes(seat.seatId)) {
                        return seat;
                    }
                    
                    // Map backend status to frontend constants
                    let newStatus = seat.status;
                    if (status === 'AVAILABLE') newStatus = SEAT_STATUS.AVAILABLE;
                    else if (status === 'LOCKED') newStatus = SEAT_STATUS.LOCKED;
                    else if (status === 'BOOKED') newStatus = SEAT_STATUS.BOOKED;
                    
                    return { ...seat, status: newStatus };
                }
                return seat;
            });
        });

        // Show notification to user
        showNotification(eventType, seatIds.length);
    };

    // Show notification when seats change
    const showNotification = (eventType: string, count: number) => {
        const messages: Record<string, string> = {
            'LOCKED': `⚠️ ${count} seat(s) locked by another user`,
            'BOOKED': `❌ ${count} seat(s) just booked`,
            'RELEASED': `✅ ${count} seat(s) now available`,
            'EXPIRED': `⏰ ${count} locked seat(s) expired and now available`
        };

        const message = messages[eventType] || 'Seat status updated';
        
        setNotification({ show: true, message });
        
        // Auto-hide notification after 4 seconds
        setTimeout(() => {
            setNotification({ show: false, message: '' });
        }, 4000);
    };

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
    
            // Properly handle LOCKED vs BOOKED status
            const mergedSeats: DisplaySeat[] = allSeats.map((seat: Seat) => {
                const seatId = seat.id;
                let status = SEAT_STATUS.AVAILABLE;
    
                // Check booked seats first
                const bookedSeat = bookedSeatMap.get(seatId);
                
                if (bookedSeat) {
                    if (bookedSeat.status === 'LOCKED') {
                        // If locked by another user, show as LOCKED
                        if (bookedSeat.userId !== (user?.userId || user?.id)) {
                            status = SEAT_STATUS.LOCKED;
                        } else {
                            // If locked by current user, treat as AVAILABLE
                            status = SEAT_STATUS.AVAILABLE;
                        }
                    } 
                    else if (bookedSeat.status === 'BOOKED') {
                        status = SEAT_STATUS.BOOKED;
                    }
                }
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
                {/* 🔔 Live Notification Banner */}
                {notification.show && (
                    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-slide-down">
                        <div className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow-2xl border border-blue-400 flex items-center gap-3">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                            <span className="font-medium">{notification.message}</span>
                        </div>
                    </div>
                )}

                {/* Connection Status & Refresh Indicator */}
                <div className="flex justify-between items-center mb-4">
                    <button
                        onClick={() => router.back()}
                        className="text-red-600 hover:text-red-700 font-medium flex items-center gap-2"
                    >
                        ← Back to Showtimes
                    </button>

                    <div className="flex items-center gap-4">
                        {/* SSE Connection Status */}
                        <div className="flex items-center gap-2 text-sm">
                            <div className={`w-2 h-2 rounded-full ${
                                isSSEConnected 
                                    ? 'bg-green-500 animate-pulse' 
                                    : 'bg-red-500'
                            }`}></div>
                            <span className="text-gray-600">
                                {isSSEConnected ? 'Live updates active' : 'Connecting...'}
                            </span>
                        </div>

                        {/* Refresh Indicator */}
                        {isRefreshing && !loading && (
                            <div className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                Refreshing...
                            </div>
                        )}
                    </div>
                </div>

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
                                            title={`Row ${seat.rowNumber}, Seat ${seat.seatNumber} - ${seat.status}`}
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

                    {/* Live Updates Info */}
                    <div className="mt-4 text-center text-sm text-gray-500">
                        <p>💡 Seats update in real-time as others book</p>
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

            {/* Add animation styles */}
            <style jsx>{`
                @keyframes slide-down {
                    from {
                        transform: translate(-50%, -100%);
                        opacity: 0;
                    }
                    to {
                        transform: translate(-50%, 0);
                        opacity: 1;
                    }
                }
                .animate-slide-down {
                    animation: slide-down 0.3s ease-out;
                }
            `}</style>
        </div>
    );
}