'use client';

import Link from 'next/link';
import { Trophy, Users, Calendar, Gamepad2, ChevronRight, Play, Crown, Medal } from 'lucide-react';
import { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Tournament {
  id: string;
  name: string;
  gameTitle: string;
  prizePool: number;
  maxPlayers: number;
  format: string;
  status: string;
  startDate: string;
  _count: { participants: number };
  organizer: { username: string };
}

export default function Home() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      const response = await axios.get(`${API_URL}/tournaments?limit=6`);
      setTournaments(response.data.tournaments);
    } catch (error) {
      console.error('Failed to fetch tournaments');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getFormatLabel = (format: string) => {
    const labels: Record<string, string> = {
      SINGLE_ELIMINATION: 'Single Elimination',
      DOUBLE_ELIMINATION: 'Double Elimination',
      ROUND_ROBIN: 'Round Robin',
    };
    return labels[format] || format;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      REGISTRATION_OPEN: 'bg-green-500',
      IN_PROGRESS: 'bg-primary-500',
      COMPLETED: 'bg-gray-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-900/20 via-dark-950 to-dark-950"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in">
              Compete in{' '}
              <span className="gradient-text">Tournaments</span>
            </h1>
            <p className="text-xl text-dark-300 mb-8 max-w-2xl mx-auto animate-slide-up">
              Join the ultimate competitive gaming platform. Create or join tournaments,
              battle for glory, and win prizes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up">
              <Link href="/tournaments" className="btn-primary text-lg px-8 py-3 flex items-center justify-center gap-2">
                <Play className="h-5 w-5" />
                Browse Tournaments
              </Link>
              <Link href="/register" className="btn-secondary text-lg px-8 py-3">
                Get Started
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16">
            {[
              { icon: Trophy, label: 'Tournaments', value: '500+' },
              { icon: Users, label: 'Players', value: '10K+' },
              { icon: Gamepad2, label: 'Games', value: '50+' },
              { icon: Medal, label: 'Prizes', value: '$100K+' },
            ].map((stat, index) => (
              <div key={index} className="card text-center">
                <stat.icon className="h-8 w-8 text-primary-500 mx-auto mb-3" />
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-dark-400 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Active Tournaments */}
      <section className="py-16 bg-dark-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold">Active Tournaments</h2>
              <p className="text-dark-400 mt-1">Join a tournament and start competing</p>
            </div>
            <Link href="/tournaments" className="text-primary-400 hover:text-primary-300 flex items-center gap-1">
              View All <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card animate-pulse">
                  <div className="h-4 bg-dark-700 rounded w-3/4 mb-4"></div>
                  <div className="h-3 bg-dark-700 rounded w-1/2 mb-4"></div>
                  <div className="h-20 bg-dark-700 rounded"></div>
                </div>
              ))}
            </div>
          ) : tournaments.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tournaments.map((tournament) => (
                <Link key={tournament.id} href={`/tournaments/${tournament.id}`} className="card hover:border-primary-500 transition-all group">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold group-hover:text-primary-400 transition-colors">
                        {tournament.name}
                      </h3>
                      <p className="text-dark-400 text-sm">{tournament.gameTitle}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(tournament.status)} text-white`}>
                      {tournament.status.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-dark-400">Prize Pool</span>
                      <span className="text-primary-400 font-semibold">${tournament.prizePool}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-dark-400">Format</span>
                      <span>{getFormatLabel(tournament.format)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-dark-400">Players</span>
                      <span>{tournament._count.participants}/{tournament.maxPlayers}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-dark-400">Starts</span>
                      <span>{formatDate(tournament.startDate)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="card text-center py-12">
              <Trophy className="h-12 w-12 text-dark-600 mx-auto mb-4" />
              <p className="text-dark-400">No active tournaments yet</p>
              <Link href="/tournaments/create" className="btn-primary mt-4 inline-block">
                Create Tournament
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose TourneyPro</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Trophy,
                title: 'Create Tournaments',
                description: 'Host your own tournaments with custom rules, formats, and prizes.',
              },
              {
                icon: Users,
                title: 'Join & Compete',
                description: 'Find tournaments that match your skill level and compete for glory.',
              },
              {
                icon: Calendar,
                title: 'Real-time Brackets',
                description: 'Watch the tournament unfold with live bracket updates and match tracking.',
              },
            ].map((feature, index) => (
              <div key={index} className="card text-center">
                <feature.icon className="h-12 w-12 text-primary-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-dark-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-primary-900/20 to-primary-800/20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Crown className="h-16 w-16 text-primary-500 mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Become a Champion?</h2>
          <p className="text-dark-300 mb-8 text-lg">
            Join thousands of players competing on TourneyPro every day.
          </p>
          <Link href="/register" className="btn-primary text-lg px-8 py-3 inline-block">
            Start Playing Now
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-dark-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <Trophy className="h-6 w-6 text-primary-500" />
              <span className="font-bold">TourneyPro</span>
            </div>
            <p className="text-dark-400 text-sm">
              © 2024 TourneyPro. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
