'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '../services/api';
import { isTokenExpired } from '../utils/helpers';
interface User {
    username: string;
    role: string;
    userId?: string;
    id?: string;
    email?: string;
    phone?: string;
    name?: string;
}
interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (userData: User) => void;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Check for existing session on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            const userData = localStorage.getItem('user');

            if (token && userData) {
                if (isTokenExpired(token)) {
                    console.log('[AuthContext] Token expired, clearing session');
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                } else {
                    console.log('[AuthContext] Valid session found');
                    setUser(JSON.parse(userData));
                }
            }
            setLoading(false);
        }
    }, []);

    const login = (userData: User) => {
        setUser(userData);
    };

    const logout = async () => {
        try {
            if (user) {
                await authAPI.logout();
            }
        } catch (err) {
            console.warn('Logout API error (continuing anyway):', err);
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
