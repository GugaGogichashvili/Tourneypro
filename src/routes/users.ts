import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get user profile
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        avatar: true,
        bio: true,
        role: true,
        createdAt: true,
        achievements: {
          include: {
            achievement: true,
          },
        },
        _count: {
          select: {
            participations: true,
            organizedTournaments: true,
            matchesAsPlayer1: true,
            matchesAsPlayer2: true,
          }
        }
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Get match history
    const matches = await prisma.match.findMany({
      where: {
        OR: [
          { player1Id: id },
          { player2Id: id }
        ],
        status: 'COMPLETED',
      },
      include: {
        player1: {
          select: { id: true, username: true, avatar: true }
        },
        player2: {
          select: { id: true, username: true, avatar: true }
        },
        winner: {
          select: { id: true, username: true, avatar: true }
        },
        tournament: {
          select: { id: true, name: true, gameTitle: true }
        }
      },
      orderBy: { completedAt: 'desc' },
      take: 20,
    });

    // Get tournament history
    const tournaments = await prisma.tournamentParticipant.findMany({
      where: { userId: id },
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
            gameTitle: true,
            status: true,
            startDate: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    res.json({
      user,
      matches,
      tournaments,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { username, bio, avatar } = req.body;
    const userId = req.user!.id;

    // Check if username is taken
    if (username) {
      const existing = await prisma.user.findFirst({
        where: { username, NOT: { id: userId } },
      });
      if (existing) {
        res.status(400).json({ error: 'Username already taken' });
        return;
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(username && { username }),
        ...(bio !== undefined && { bio }),
        ...(avatar !== undefined && { avatar }),
      },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        bio: true,
        role: true,
      },
    });

    res.json({ user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get leaderboard
router.get('/leaderboard/top', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    // Get users with their win counts
    const users = await prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        username: true,
        avatar: true,
        _count: {
          select: {
            matchesAsPlayer1: {
              where: { winnerId: undefined !== undefined }
            }
          }
        }
      },
      take: limit,
    });

    // This is a simplified leaderboard - in a real app you'd track wins properly
    const leaderboard = await prisma.$queryRaw`
      SELECT u.id, u.username, u.avatar,
             COUNT(CASE WHEN m.winner_id = u.id THEN 1 END) as wins,
             COUNT(m.id) as total_matches
      FROM users u
      LEFT JOIN "Match" m ON (m."player1Id" = u.id OR m."player2Id" = u.id) AND m.status = 'COMPLETED'
      WHERE u.status = 'ACTIVE'
      GROUP BY u.id
      ORDER BY wins DESC
      LIMIT ${limit}
    `;

    res.json({ leaderboard });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// Get all users (for admin)
router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const role = req.query.role as string;

    const where: any = {};
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) {
      where.role = role;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          status: true,
          avatar: true,
          createdAt: true,
          _count: {
            select: {
              participations: true,
              organizedTournaments: true,
            }
          }
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

export default router;
