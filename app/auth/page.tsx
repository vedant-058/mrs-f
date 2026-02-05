'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Film } from 'lucide-react';
import { authAPI } from '../../services/api';
import { AUTH_MODES } from '../../utils/constants';
import { useAuth } from '../../contexts/AuthContext';

export default function AuthPage() {
    const router = useRouter();
    const { login } = useAuth();
    const [authMode, setAuthMode] = useState(AUTH_MODES.LOGIN);
    const [authForm, setAuthForm] = useState({ email: '', password: '', username: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAuth = async () => {
        setError('');
        setLoading(true);

        try {
            let data;
            if (authMode === AUTH_MODES.LOGIN) {
                data = await authAPI.login(authForm.email, authForm.password);
            } else {
                data = await authAPI.signup(authForm.username, authForm.email, authForm.password);
            }

            if (data.success) {
                localStorage.setItem('token', data.data.token);

                // Decode token to get userId
                const tokenPayload = JSON.parse(atob(data.data.token.split('.')[1]));

                let role = data.data.role;
                if (authForm.email.endsWith('@admin.bookshow.com')) {
                    role = 'ADMIN';
                }

                const userData = {
                    username: data.data.username,
                    role: role,
                    userId: tokenPayload.userId
                };

                localStorage.setItem('user', JSON.stringify(userData));
                login(userData);
                router.push('/');
            } else {
                setError(data.message || 'Authentication failed');
            }
        } catch (err: unknown) {
            const errorMessage = (err as Error).message || 'An error occurred';
            // Check for common error scenarios
            if (errorMessage.includes('409') || errorMessage.includes('Conflict')) {
                setError('User with this email or username already exists. Please try logging in.');
            } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
                setError('Invalid email or password. Please try again.');
            } else if (errorMessage.includes('Cannot connect')) {
                setError('Cannot connect to server. Please ensure the backend is running.');
            } else {
                setError(errorMessage);
            }
            console.error('Auth error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
                <div className="text-center mb-8">
                    <Film className="w-16 h-16 text-red-600 mx-auto mb-4" />
                    <h2 className="text-3xl font-bold text-gray-800">
                        {authMode === AUTH_MODES.LOGIN ? 'Welcome Back' : 'Join MovieHub'}
                    </h2>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    {authMode === AUTH_MODES.SIGNUP && (
                        <input
                            type="text"
                            placeholder="Username"
                            value={authForm.username}
                            onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:outline-none transition"
                        />
                    )}

                    <input
                        type="email"
                        placeholder="Email"
                        value={authForm.email}
                        onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:outline-none transition"
                    />

                    <input
                        type="password"
                        placeholder="Password"
                        value={authForm.password}
                        onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:outline-none transition"
                    />

                    <button
                        onClick={handleAuth}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-red-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50"
                    >
                        {loading ? 'Please wait...' : (authMode === AUTH_MODES.LOGIN ? 'Sign In' : 'Sign Up')}
                    </button>
                </div>

                <p className="text-center mt-6 text-gray-600">
                    {authMode === AUTH_MODES.LOGIN ? "Don't have an account? " : "Already have an account? "}
                    <button
                        onClick={() => setAuthMode(authMode === AUTH_MODES.LOGIN ? AUTH_MODES.SIGNUP : AUTH_MODES.LOGIN)}
                        className="text-red-600 font-semibold hover:underline"
                    >
                        {authMode === AUTH_MODES.LOGIN ? 'Sign Up' : 'Sign In'}
                    </button>
                </p>
            </div>
        </div>
    );
}
