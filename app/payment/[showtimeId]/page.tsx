'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Clock, CreditCard, ArrowLeft, CheckCircle, XCircle, Ticket } from 'lucide-react';
import Header from '../../../components/Headers';
import { useAuth } from '../../../contexts/AuthContext';
import { seatAPI, showtimeAPI } from '../../../services/api';
import { SEAT_PRICE } from '../../../utils/constants';

interface SeatData {
    seatId: string;
    rowNumber: string;
    seatNumber: number;
    xPos: number;
    yPos: number;
}

// Add these new interfaces:
interface BookedSeatInfo {
    seatId: string;
    showtimeId: string;
    status: 'AVAILABLE' | 'LOCKED' | 'BOOKED';
    userId: string | null;
    lockedAt?: string;
    bookedAt?: string;
}

interface AllSeatInfo {
    id: string;
    screenId: string;
    rowNumber: string;
    seatNumber: number;
    xPos: number;
    yPos: number;
}

export default function PaymentPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const showtimeId = params.showtimeId as string;
    const seatIds = searchParams.get('seats')?.split(',').filter(Boolean) || [];

    const { user, loading: authLoading, logout } = useAuth();

    const [timeLeft, setTimeLeft] = useState(300);
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'failed'>('idle');
    const [seats, setSeats] = useState<SeatData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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

    // ✅ NEW: Validate that seats are locked by current user
    const validateSeatOwnership = async () => {
        try {
            setLoading(true);
            
            // Quick check: make sure seats aren't booked by someone else
            const bookedSeatsRes = await showtimeAPI.getBookedSeats(showtimeId);
            
            if (bookedSeatsRes.success) {
                const bookedSeats = (bookedSeatsRes.data || []) as BookedSeatInfo[];
                const alreadyBooked = seatIds.some((seatId: string) => 
                    bookedSeats.some((seat) => seat.seatId === seatId)
                );
                
                if (alreadyBooked) {
                    console.log('❌ Some seats are already booked');
                    setError('Some seats are no longer available');
                    setLoading(false);
                    return;
                }
            }
            
            // Seats were locked on previous page, just load details
            console.log('✅ Seats are locked, loading details...');
            await loadSeats();
            
        } catch (err) {
            console.error('❌ Error validating seats:', err);
            setError('Failed to verify seat availability');
            setLoading(false);
        }
    };
    const loadSeats = async () => {
        try {
            // Try sessionStorage first
            const storedData = sessionStorage.getItem('paymentData');
            if (storedData) {
                const data = JSON.parse(storedData);
                if (data.showtimeId === showtimeId && 
                    JSON.stringify(data.seatIds.sort()) === JSON.stringify(seatIds.sort())) {
                    setSeats(data.seats);
                    setLoading(false);
                    return;
                }
            }

            // Otherwise fetch from API
            const seatsRes = await showtimeAPI.getSeatsByShowtime(showtimeId);

            if (seatsRes.success && seatsRes.data) {
                const selectedSeats = seatsRes.data
                    .filter((seat: any) => seatIds.includes(seat.id))
                    .map((seat: any) => ({
                        seatId: seat.id,
                        rowNumber: seat.rowNumber,
                        seatNumber: seat.seatNumber,
                        xPos: seat.xPos ?? 0,
                        yPos: seat.yPos ?? 0
                    }));
                setSeats(selectedSeats);
            } else {
                setError('Failed to load seat details');
            }
        } catch (err) {
            console.error('Error loading seats:', err);
            setError('Failed to load seat details');
        } finally {
            setLoading(false);
        }
    };

    // Timer countdown
    useEffect(() => {
        if (paymentStatus === 'success' || timeLeft <= 0) {
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleTimeout();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [paymentStatus, timeLeft]);

    const handleTimeout = async () => {
        try {
            await seatAPI.releaseSeats(seatIds, showtimeId, user?.userId || user?.id);
            sessionStorage.removeItem('paymentData');
            alert('Payment time expired. Seats have been released.');
            router.push('/');
        } catch (err) {
            console.error('Error releasing seats:', err);
            router.push('/');
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const totalAmount = seatIds.length * SEAT_PRICE;

    const handleDemoPayment = async () => {
        setIsProcessing(true);
    
        try {
            const bookedSeatsRes = await showtimeAPI.getBookedSeats(showtimeId);
            if (bookedSeatsRes.success) {
                const bookedSeats = (bookedSeatsRes.data || []) as BookedSeatInfo[];
                const alreadyBooked = seatIds.some((seatId: string) => 
                    bookedSeats.some((seat) => 
                        seat.seatId === seatId && seat.status === 'BOOKED'
                    )
                );
    
                if (alreadyBooked) {
                    throw new Error('Seats no longer available');
                }
            }
    
            await new Promise(resolve => setTimeout(resolve, 2000));
    
            const confirmRes = await seatAPI.confirmBooking(
                seatIds,
                showtimeId,
                user?.userId || user?.id
            );
    
            if (confirmRes.success) {
                setPaymentStatus('success');
                sessionStorage.removeItem('paymentData');
                
                setTimeout(() => {
                    alert(`Booking confirmed! Reservation ID: ${confirmRes.data.reservationId}\nAmount: ₹${totalAmount}`);
                    router.push('/');
                }, 1500);
            } else {
                throw new Error('Booking confirmation failed');
            }
        } catch (err: any) {
            console.error('Payment error:', err);
            setPaymentStatus('failed');
            alert(err.message || 'Payment failed. Please try again.');
            
            if (err.message === 'Seats no longer available') {
                setTimeout(() => router.push('/'), 2000);
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const handleBack = async () => {
        if (confirm('Return to seat selection? Your seats will remain locked until you complete payment or the timer expires.')) {
            sessionStorage.removeItem('paymentData');
            router.back();
        }
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
                    <p className="text-gray-400">Verifying seat availability...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-red-400 mb-2">Seat Unavailable</h3>
                    <p className="text-gray-400 mb-4">{error}</p>
                    <button
                        onClick={() => router.push('/')}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
                    >
                        Go to Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
            <Header 
                user={user} 
                onLogout={async () => {
                    await logout();
                    router.push('/');
                }}
                onNavigateHome={() => router.push('/')}
                onNavigateAuth={() => router.push('/auth')}
            />

            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <button
                    onClick={handleBack}
                    className="mb-6 text-blue-400 hover:text-blue-300 flex items-center gap-2 transition-colors"
                    disabled={isProcessing || paymentStatus === 'success'}
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Seat Selection
                </button>

                <div className={`mb-6 p-4 rounded-lg border-2 flex items-center justify-center gap-3 ${
                    timeLeft < 60 
                        ? 'bg-red-500/10 border-red-500 animate-pulse' 
                        : 'bg-yellow-500/10 border-yellow-500'
                }`}>
                    <Clock className={`w-6 h-6 ${timeLeft < 60 ? 'text-red-400' : 'text-yellow-400'}`} />
                    <div className="text-center">
                        <p className="text-sm text-gray-300">Complete payment within</p>
                        <p className={`text-2xl font-bold ${timeLeft < 60 ? 'text-red-400' : 'text-yellow-400'}`}>
                            {formatTime(timeLeft)}
                        </p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Ticket className="w-5 h-5" />
                            Booking Summary
                        </h2>

                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Selected Seats</span>
                                <span className="font-medium">{seatIds.length}</span>
                            </div>

                            <div className="border-t border-gray-700 pt-3">
                                {seats.length > 0 ? (
                                    seats.map((seat) => (
                                        <div key={seat.seatId} className="flex justify-between text-sm mb-2">
                                            <span className="text-gray-300">
                                                Row {seat.rowNumber}, Seat {seat.seatNumber}
                                            </span>
                                            <span className="text-gray-400">₹{SEAT_PRICE}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-400">Loading seat details...</p>
                                )}
                            </div>

                            <div className="border-t border-gray-700 pt-3 flex justify-between text-lg font-bold">
                                <span>Total Amount</span>
                                <span className="text-yellow-400">₹{totalAmount}</span>
                            </div>
                        </div>

                        <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3 text-sm text-blue-300">
                            💡 Your seats are locked for 5 minutes. Complete payment to confirm your booking.
                        </div>
                    </div>

                    <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <CreditCard className="w-5 h-5" />
                            Payment
                        </h2>

                        {paymentStatus === 'success' ? (
                            <div className="text-center py-8">
                                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-green-400 mb-2">Payment Successful!</h3>
                                <p className="text-gray-400">Redirecting...</p>
                            </div>
                        ) : paymentStatus === 'failed' ? (
                            <div className="text-center py-8">
                                <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-red-400 mb-2">Payment Failed</h3>
                                <p className="text-gray-400 mb-4">Please try again</p>
                                <button
                                    onClick={() => setPaymentStatus('idle')}
                                    className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
                                >
                                    Retry Payment
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
                                    <p className="text-sm text-gray-300 mb-2">💳 Amount to Pay</p>
                                    <p className="text-3xl font-bold text-yellow-400">₹{totalAmount}</p>
                                </div>

                                <button
                                    onClick={handleDemoPayment}
                                    disabled={isProcessing}
                                    className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-yellow-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isProcessing ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <CreditCard className="w-5 h-5" />
                                            Pay Now (Demo)
                                        </>
                                    )}
                                </button>

                                <p className="text-xs text-gray-500 text-center mt-4">
                                    🔒 Secure payment • 100% safe • Demo mode
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}