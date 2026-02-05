'use client';

import { Film, User, LogOut } from 'lucide-react';

export default function Header({ user, onLogout, onNavigateHome, onNavigateAuth }) {
  return (
    <header className="bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer" 
            onClick={onNavigateHome}
          >
            <Film className="w-8 h-8" />
            <h1 className="text-2xl font-bold">MovieHub</h1>
          </div>
          
          <nav className="flex items-center gap-6">
            {user ? (
              <>
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  <span className="font-medium">{user.username}</span>
                </div>
                <button 
                  onClick={onLogout}
                  className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </>
            ) : (
              <button 
                onClick={onNavigateAuth}
                className="bg-white text-red-600 hover:bg-gray-100 px-6 py-2 rounded-lg font-semibold transition"
              >
                Sign In
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}