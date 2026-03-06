import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Validation schema
const tournamentSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().optional(),
  gameTitle: z.string().min(1),
  rules: z.string().optional(),
  prizePool: z.number().min(0).default(0),
  entryFee: z.number().min(0).default(0),
  maxPlayers: z.number().min(2).max(128),
  format: z.enum(['SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN']),
  startDate: z.string(),
  checkInTime: z.string().optional(),
});

// Create tournament
router.post('/', authenticateToken, requireRole('ORGANIZER', 'ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = tournamentSchema.parse(req.body);
    const userId = req.user!.id;

    const tournament = await prisma.tournament.create({
      data: {
        name: data.name,
        description: data.description,
        gameTitle: data.gameTitle,
        rules: data.rules,
        prizePool: data.prizePool,
        entryFee: data.entryFee,
        maxPlayers: data.maxPlayers,
        format: data.format,
        startDate: new Date(data.startDate),
        checkInTime: data.checkInTime ? new Date(data.checkInTime) : null,
        organizerId: userId,
        status: 'DRAFT',
      },
      include: {
        organizer: {
          select: { id: true, username: true, avatar: true }
        }
      }
    });

    res.status(201).json({ tournament });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    console.error('Create tournament error:', error);
    res.status(500).json({ error: 'Failed to create tournament' });
  }
});

// Get all tournaments (public)
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const search = req.query.search as string;
    const game = req.query.game as string;
    const format = req.query.format as string;
    const status = req.query.status as string;

    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { gameTitle: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (game) {
      where.gameTitle = game;
    }
    if (format) {
      where.format = format;
    }
    if (status) {
      where.status = status;
    } else {
      // Default: show active tournaments
      where.status = { in: ['REGISTRATION_OPEN', 'IN_PROGRESS'] };
    }

    const [tournaments, total] = await Promise.all([
      prisma.tournament.findMany({
        where,
        include: {
          organizer: {
            select: { id: true, username: true, avatar: true }
          },
          _count: {
            select: { participants: true }
          }
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { startDate: 'asc' },
      }),
      prisma.tournament.count({ where }),
    ]);

    res.json({
      tournaments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get tournaments error:', error);
    res.status(500).json({ error: 'Failed to get tournaments' });
  }
});

// Get single tournament
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        organizer: {
          select: { id: true, username: true, avatar: true }
        },
        participants: {
          where: { status: 'APPROVED' },
          include: {
            user: {
              select: { id: true, username: true, avatar: true }
            }
          },
          orderBy: { seed: 'asc' }
        },
        matches: {
          include: {
            player1: { select: { id: true, username: true, avatar: true } },
            player2: { select: { id: true, username: true, avatar: true } },
            winner: { select: { id: true, username: true, avatar: true } }
          },
          orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }]
        }
      },
    });

    if (!tournament) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }

    // Get bracket data
    const bracketData = await prisma.bracketData.findUnique({
      where: { tournamentId: id }
    });

    res.json({ tournament, bracketData: bracketData?.data });
  } catch (error) {
    console.error('Get tournament error:', error);
    res.status(500).json({ error: 'Failed to get tournament' });
  }
});

// Update tournament
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const tournament = await prisma.tournament.findUnique({ where: { id } });

    if (!tournament) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }

    // Check ownership or admin
    if (tournament.organizerId !== userId && userRole !== 'ADMIN') {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const data = tournamentSchema.partial().parse(req.body);

    const updated = await prisma.tournament.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.gameTitle && { gameTitle: data.gameTitle }),
        ...(data.rules !== undefined && { rules: data.rules }),
        ...(data.prizePool !== undefined && { prizePool: data.prizePool }),
        ...(data.entryFee !== undefined && { entryFee: data.entryFee }),
        ...(data.maxPlayers && { maxPlayers: data.maxPlayers }),
        ...(data.format && { format: data.format }),
        ...(data.startDate && { startDate: new Date(data.startDate) }),
        ...(data.checkInTime !== undefined && { 
          checkInTime: data.checkInTime ? new Date(data.checkInTime) : null 
        }),
      },
      include: {
        organizer: {
          select: { id: true, username: true, avatar: true }
        }
      }
    });

    res.json({ tournament: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    console.error('Update tournament error:', error);
    res.status(500).json({ error: 'Failed to update tournament' });
  }
});

// Delete tournament
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const tournament = await prisma.tournament.findUnique({ where: { id } });

    if (!tournament) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }

    if (tournament.organizerId !== userId && userRole !== 'ADMIN') {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    await prisma.tournament.delete({ where: { id } });

    res.json({ message: 'Tournament deleted' });
  } catch (error) {
    console.error('Delete tournament error:', error);
    res.status(500).json({ error: 'Failed to delete tournament' });
  }
});

// Register for tournament
router.post('/:id/register', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        _count: { select: { participants: true } }
      }
    });

    if (!tournament) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }

    if (tournament.status !== 'REGISTRATION_OPEN') {
      res.status(400).json({ error: 'Registration is not open' });
      return;
    }

    if (tournament._count.participants >= tournament.maxPlayers) {
      res.status(400).json({ error: 'Tournament is full' });
      return;
    }

    // Check if already registered
    const existing = await prisma.tournamentParticipant.findUnique({
      where: {
        tournamentId_userId: {
          tournamentId: id,
          userId
        }
      }
    });

    if (existing) {
      res.status(400).json({ error: 'Already registered' });
      return;
    }

    // Auto-approve if no entry fee
    const status = tournament.entryFee > 0 ? 'PENDING' : 'APPROVED';

    await prisma.tournamentParticipant.create({
      data: {
        tournamentId: id,
        userId,
        status,
      }
    });

    res.status(201).json({ message: 'Registration successful' });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Failed to register' });
  }
});

// Approve/reject participant
router.put('/:id/participants/:userId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id, userId } = req.params;
    const { status } = req.body;
    const organizerId = req.user!.id;

    const tournament = await prisma.tournament.findUnique({ where: { id } });

    if (!tournament) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }

    if (tournament.organizerId !== organizerId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const participant = await prisma.tournamentParticipant.update({
      where: {
        tournamentId_userId: {
          tournamentId: id,
          userId
        }
      },
      data: { status },
      include: {
        user: { select: { id: true, username: true, avatar: true } }
      }
    });

    res.json({ participant });
  } catch (error) {
    console.error('Update participant error:', error);
    res.status(500).json({ error: 'Failed to update participant' });
  }
});

// Start tournament (generate bracket)
router.post('/:id/start', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        participants: {
          where: { status: 'APPROVED' },
          orderBy: { seed: 'asc' }
        }
      }
    });

    if (!tournament) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }

    if (tournament.organizerId !== userId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    if (tournament.participants.length < 2) {
      res.status(400).json({ error: 'Need at least 2 participants' });
      return;
    }

    // Generate bracket based on format
    const matches = generateBracket(tournament.format, tournament.participants, id);

    await prisma.match.createMany({ data: matches });

    // Update tournament status
    await prisma.tournament.update({
      where: { id },
      data: { status: 'IN_PROGRESS' }
    });

    res.json({ message: 'Tournament started', matchCount: matches.length });
  } catch (error) {
    console.error('Start tournament error:', error);
    res.status(500).json({ error: 'Failed to start tournament' });
  }
});

// Helper function to generate bracket
function generateBracket(format: string, participants: any[], tournamentId: string) {
  const matches = [];
  const players = participants.map(p => p.userId);
  
  if (format === 'SINGLE_ELIMINATION') {
    const rounds = Math.ceil(Math.log2(players.length));
    let matchNumber = 0;
    
    for (let round = 1; round <= rounds; round++) {
      const matchesInRound = Math.pow(2, rounds - round);
      for (let i = 0; i < matchesInRound; i++) {
        matchNumber++;
        const player1Index = i * 2;
        const player2Index = i * 2 + 1;
        
        // Seed players in first round
        const match: any = {
          tournamentId,
          round,
          matchNumber,
          position: i,
          status: round === 1 ? 'READY' : 'PENDING',
        };
        
        if (round === 1) {
          if (players[player1Index]) match.player1Id = players[player1Index];
          if (players[player2Index]) match.player2Id = players[player2Index];
          if (match.player1Id && match.player2Id) {
            match.status = 'READY';
          }
        }
        
        matches.push(match);
      }
    }
  } else if (format === 'ROUND_ROBIN') {
    // Round robin - everyone plays everyone
    for (let round = 1; round <= players.length - 1; round++) {
      for (let i = 0; i < Math.floor(players.length / 2); i++) {
        matches.push({
          tournamentId,
          round,
          matchNumber: matches.length + 1,
          position: i,
          status: 'READY',
          player1Id: players[i],
          player2Id: players[players.length - 1 - i]
        });
      }
    }
  }
  
  return matches;
}

// Get my tournaments
router.get('/my/organized', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const tournaments = await prisma.tournament.findMany({
      where: { organizerId: userId },
      include: {
        _count: { select: { participants: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ tournaments });
  } catch (error) {
    console.error('Get my tournaments error:', error);
    res.status(500).json({ error: 'Failed to get tournaments' });
  }
});

// Get my registrations
router.get('/my/registered', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const participations = await prisma.tournamentParticipant.findMany({
      where: { userId },
      include: {
        tournament: {
          include: {
            organizer: { select: { id: true, username: true } },
            _count: { select: { participants: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ participations });
  } catch (error) {
    console.error('Get my registrations error:', error);
    res.status(500).json({ error: 'Failed to get registrations' });
  }
});

export default router;
