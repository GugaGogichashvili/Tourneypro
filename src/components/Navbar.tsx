'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Trophy, Menu, X, User, LogOut, Plus, Bell } from 'lucide-react';
import { useState } from 'react';

export function Navbar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-900/90 backdrop-blur-md border-b border-dark-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <Trophy className="h-8 w-8 text-primary-500" />
            <span className="text-xl font-bold gradient-text">TourneyPro</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <Link href="/tournaments" className="text-dark-300 hover:text-white transition-colors">
              Tournaments
            </Link>
            <Link href="/leaderboard" className="text-dark-300 hover:text-white transition-colors">
              Leaderboard
            </Link>
            
            {user && (
              <Link href="/dashboard" className="text-dark-300 hover:text-white transition-colors">
                Dashboard
              </Link>
            )}
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                <Link href="/notifications" className="relative p-2 text-dark-300 hover:text-white">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-1 right-1 h-2 w-2 bg-primary-500 rounded-full"></span>
                </Link>
                <Link href="/profile" className="flex items-center space-x-2">
                  <img
                    src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                    alt={user.username}
                    className="h-8 w-8 rounded-full border-2 border-primary-500"
                  />
                  <span className="text-sm font-medium">{user.username}</span>
                </Link>
                <button
                  onClick={logout}
                  className="p-2 text-dark-300 hover:text-white transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link href="/login" className="text-dark-300 hover:text-white transition-colors">
                  Login
                </Link>
                <Link href="/register" className="btn-primary">
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 text-dark-300 hover:text-white"
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-dark-900 border-t border-dark-700">
          <div className="px-4 py-4 space-y-3">
            <Link
              href="/tournaments"
              className="block py-2 text-dark-300 hover:text-white"
              onClick={() => setMenuOpen(false)}
            >
              Tournaments
            </Link>
            <Link
              href="/leaderboard"
              className="block py-2 text-dark-300 hover:text-white"
              onClick={() => setMenuOpen(false)}
            >
              Leaderboard
            </Link>
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="block py-2 text-dark-300 hover:text-white"
                  onClick={() => setMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  href="/profile"
                  className="block py-2 text-dark-300 hover:text-white"
                  onClick={() => setMenuOpen(false)}
                >
                  Profile
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setMenuOpen(false);
                  }}
                  className="block py-2 text-dark-300 hover:text-white w-full text-left"
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="space-y-2 pt-2 border-t border-dark-700">
                <Link
                  href="/login"
                  className="block py-2 text-dark-300 hover:text-white"
                  onClick={() => setMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="block py-2 btn-primary text-center"
                  onClick={() => setMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
