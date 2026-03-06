import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@tourneypro.com' },
    update: {},
    create: {
      email: 'admin@tourneypro.com',
      username: 'Admin',
      password: adminPassword,
      role: 'ADMIN',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
    },
  });
  console.log('✅ Created admin user');

  // Create organizer user
  const organizerPassword = await bcrypt.hash('organizer123', 12);
  const organizer = await prisma.user.upsert({
    where: { email: 'organizer@tourneypro.com' },
    update: {},
    create: {
      email: 'organizer@tourneypro.com',
      username: 'TournamentKing',
      password: organizerPassword,
      role: 'ORGANIZER',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=organizer',
      bio: 'Professional tournament organizer with 5+ years of experience.',
    },
  });
  console.log('✅ Created organizer user');

  // Create player users
  const playerPassword = await bcrypt.hash('player123', 12);
  const players = [];
  const playerNames = ['ProGamer', 'NightOwl', 'ShadowHunter', 'DragonSlayer', 'CyberNinja', 'StarLord', 'MegaMaster', 'UltraPlayer'];

  for (let i = 0; i < playerNames.length; i++) {
    const player = await prisma.user.upsert({
      where: { email: `player${i + 1}@tourneypro.com` },
      update: {},
      create: {
        email: `player${i + 1}@tourneypro.com`,
        username: playerNames[i],
        password: playerPassword,
        role: 'PLAYER',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=player${i + 1}`,
      },
    });
    players.push(player);
  }
  console.log('✅ Created player users');

  // Create achievements
  const achievements = await Promise.all([
    prisma.achievement.upsert({
      where: { id: 'first-tournament' },
      update: {},
      create: {
        id: 'first-tournament',
        name: 'First Tournament',
        description: 'Participated in your first tournament',
        icon: '🏆',
      },
    }),
    prisma.achievement.upsert({
      where: { id: 'winner' },
      update: {},
      create: {
        id: 'winner',
        name: 'Champion',
        description: 'Won a tournament',
        icon: '🥇',
      },
    }),
    prisma.achievement.upsert({
      where: { id: 'organizer' },
      update: {},
      create: {
        id: 'organizer',
        name: 'Event Master',
        description: 'Created your first tournament',
        icon: '🎯',
      },
    }),
    prisma.achievement.upsert({
      where: { id: 'veteran' },
      update: {},
      create: {
        id: 'veteran',
        name: 'Veteran',
        description: 'Participated in 10 tournaments',
        icon: '⭐',
      },
    }),
  ]);
  console.log('✅ Created achievements');

  // Create sample tournaments
  const games = ['Valorant', 'League of Legends', 'CS2', 'Dota 2', 'Rocket League'];
  const formats = ['SINGLE_ELIMINATION', 'ROUND_ROBIN'] as const;

  for (let i = 0; i < 5; i++) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + (i + 1) * 7);
    
    const tournament = await prisma.tournament.upsert({
      where: { id: `tournament-${i + 1}` },
      update: {},
      create: {
        id: `tournament-${i + 1}`,
        name: `${games[i]} Championship ${2024}`,
        description: `Join the ultimate ${games[i]} competition! Compete against the best players for glory and prizes.`,
        gameTitle: games[i],
        rules: '- Single elimination format\n- Best of 3 matches\n- No cheats or exploits allowed\n- Respect all players',
        prizePool: (i + 1) * 500,
        entryFee: i * 10,
        maxPlayers: 8,
        format: formats[i % 2],
        status: i < 2 ? 'REGISTRATION_OPEN' : 'REGISTRATION_OPEN',
        startDate,
        organizerId: organizer.id,
      },
    });

    // Add participants
    const numParticipants = Math.min(8, players.length + 2);
    for (let j = 0; j < numParticipants; j++) {
      const playerId = j < players.length ? players[j].id : organizer.id;
      await prisma.tournamentParticipant.upsert({
        where: {
          tournamentId_userId: {
            tournamentId: tournament.id,
            userId: playerId,
          }
        },
        update: {},
        create: {
          tournamentId: tournament.id,
          userId: playerId,
          status: 'APPROVED',
          seed: j + 1,
        },
      });
    }
  }
  console.log('✅ Created sample tournaments');

  // Create a completed tournament
  const completedTournament = await prisma.tournament.upsert({
    where: { id: 'tournament-completed' },
    update: {},
    create: {
      id: 'tournament-completed',
      name: 'Winter Championship 2024',
      description: 'The annual winter championship has concluded!',
      gameTitle: 'Valorant',
      rules: '- Single elimination\n- Best of 3',
      prizePool: 1000,
      entryFee: 25,
      maxPlayers: 8,
      format: 'SINGLE_ELIMINATION',
      status: 'COMPLETED',
      startDate: new Date('2024-01-15'),
      organizerId: organizer.id,
    },
  });

  // Add participants to completed tournament
  for (let j = 0; j < 4; j++) {
    await prisma.tournamentParticipant.upsert({
      where: {
        tournamentId_userId: {
          tournamentId: completedTournament.id,
          userId: players[j].id,
        }
      },
      update: {},
      create: {
        tournamentId: completedTournament.id,
        userId: players[j].id,
        status: 'APPROVED',
        seed: j + 1,
      },
    });
  }

  // Create matches for completed tournament
  const matches = [
    { round: 1, matchNumber: 1, player1Id: players[0].id, player2Id: players[1].id, winnerId: players[0].id },
    { round: 1, matchNumber: 2, player1Id: players[2].id, player2Id: players[3].id, winnerId: players[2].id },
    { round: 2, matchNumber: 1, player1Id: players[0].id, player2Id: players[2].id, winnerId: players[0].id },
  ];

  for (const m of matches) {
    await prisma.match.upsert({
      where: {
        tournamentId_round_matchNumber: {
          tournamentId: completedTournament.id,
          round: m.round,
          matchNumber: m.matchNumber,
        }
      },
      update: {},
      create: {
        tournamentId: completedTournament.id,
        round: m.round,
        matchNumber: m.matchNumber,
        position: m.matchNumber - 1,
        player1Id: m.player1Id,
        player2Id: m.player2Id,
        winnerId: m.winnerId,
        status: 'COMPLETED',
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });
  }
  console.log('✅ Created completed tournament');

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
