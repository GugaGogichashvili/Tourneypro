'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { Search, Filter, Trophy, Users, Calendar, DollarSign } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Tournament {
  id: string;
  name: string;
  gameTitle: string;
  description: string;
  prizePool: number;
  entryFee: number;
  maxPlayers: number;
  format: string;
  status: string;
  startDate: string;
  _count: { participants: number };
  organizer: { username: string };
}

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [game, setGame] = useState('');
  const [format, setFormat] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchTournaments();
  }, [search, game, format, page]);

  const fetchTournaments = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (game) params.append('game', game);
      if (format) params.append('format', format);
      params.append('page', page.toString());
      params.append('limit', '12');

      const response = await axios.get(`${API_URL}/tournaments?${params}`);
      setTournaments(response.data.tournaments);
      setTotalPages(response.data.pagination.pages);
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

  const getFormatLabel = (f: string) => {
    const labels: Record<string, string> = {
      SINGLE_ELIMINATION: 'Single Elimination',
      DOUBLE_ELIMINATION: 'Double Elimination',
      ROUND_ROBIN: 'Round Robin',
    };
    return labels[f] || f;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      REGISTRATION_OPEN: 'bg-green-500',
      IN_PROGRESS: 'bg-primary-500',
      COMPLETED: 'bg-gray-500',
      DRAFT: 'bg-yellow-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  const games = ['Valorant', 'League of Legends', 'CS2', 'Dota 2', 'Rocket League'];
  const formats = ['SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN'];

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Tournaments</h1>
            <p className="text-dark-400 mt-1">Find and join competitive tournaments</p>
          </div>
          <Link href="/tournaments/create" className="btn-primary">
            Create Tournament
          </Link>
        </div>

        {/* Filters */}
        <div className="card mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-400" />
              <input
                type="text"
                placeholder="Search tournaments..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input w-full pl-10"
              />
            </div>
            <select
              value={game}
              onChange={(e) => setGame(e.target.value)}
              className="input"
            >
              <option value="">All Games</option>
              {games.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="input"
            >
              <option value="">All Formats</option>
              {formats.map((f) => (
                <option key={f} value={f}>{getFormatLabel(f)}</option>
              ))}
            </select>
            <Link href="/tournaments" className="btn-secondary text-center">
              Clear Filters
            </Link>
          </div>
        </div>

        {/* Tournament Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-4 bg-dark-700 rounded w-3/4 mb-4"></div>
                <div className="h-3 bg-dark-700 rounded w-1/2 mb-4"></div>
                <div className="h-20 bg-dark-700 rounded"></div>
              </div>
            ))}
          </div>
        ) : tournaments.length > 0 ? (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tournaments.map((tournament) => (
                <Link
                  key={tournament.id}
                  href={`/tournaments/${tournament.id}`}
                  className="card hover:border-primary-500 transition-all group"
                >
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

                  <p className="text-dark-400 text-sm line-clamp-2 mb-4">
                    {tournament.description}
                  </p>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-dark-400 flex items-center gap-1">
                        <DollarSign className="h-4 w-4" /> Prize Pool
                      </span>
                      <span className="text-primary-400 font-semibold">${tournament.prizePool}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-dark-400 flex items-center gap-1">
                        <Users className="h-4 w-4" /> Players
                      </span>
                      <span>{tournament._count.participants}/{tournament.maxPlayers}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-dark-400 flex items-center gap-1">
                        <Trophy className="h-4 w-4" /> Format
                      </span>
                      <span>{getFormatLabel(tournament.format)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-dark-400 flex items-center gap-1">
                        <Calendar className="h-4 w-4" /> Start Date
                      </span>
                      <span>{formatDate(tournament.startDate)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="flex items-center px-4">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn-secondary disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="card text-center py-12">
            <Trophy className="h-12 w-12 text-dark-600 mx-auto mb-4" />
            <p className="text-dark-400">No tournaments found</p>
            <Link href="/tournaments/create" className="btn-primary mt-4 inline-block">
              Create the first tournament
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
