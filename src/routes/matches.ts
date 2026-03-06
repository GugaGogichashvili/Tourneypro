import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get match by ID
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        player1: { select: { id: true, username: true, avatar: true } },
        player2: { select: { id: true, username: true, avatar: true } },
        winner: { select: { id: true, username: true, avatar: true } },
        tournament: {
          select: { id: true, name: true, gameTitle: true, organizerId: true }
        },
        results: {
          include: {
            player: { select: { id: true, username: true } }
          }
        }
      },
    });

    if (!match) {
      res.status(404).json({ error: 'Match not found' });
      return;
    }

    res.json({ match });
  } catch (error) {
    console.error('Get match error:', error);
    res.status(500).json({ error: 'Failed to get match' });
  }
});

// Submit match result
router.post('/:id/result', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { winnerId, player1Score, player2Score } = req.body;

    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        tournament: true,
        player1: true,
        player2: true,
      },
    });

    if (!match) {
      res.status(404).json({ error: 'Match not found' });
      return;
    }

    // Check if user is participant or organizer
    const isParticipant = match.player1Id === userId || match.player2Id === userId;
    const isOrganizer = match.tournament.organizerId === userId;
    const isAdmin = req.user!.role === 'ADMIN';

    if (!isParticipant && !isOrganizer && !isAdmin) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    if (match.status === 'COMPLETED') {
      res.status(400).json({ error: 'Match already completed' });
      return;
    }

    // Update match
    const updated = await prisma.match.update({
      where: { id },
      data: {
        winnerId,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    // Record results
    await prisma.matchResult.upsert({
      where: {
        matchId_playerId: {
          matchId: id,
          playerId: match.player1Id!,
        }
      },
      create: {
        matchId: id,
        playerId: match.player1Id!,
        score: player1Score,
        won: winnerId === match.player1Id,
      },
      update: {
        score: player1Score,
        won: winnerId === match.player1Id,
      },
    });

    await prisma.matchResult.upsert({
      where: {
        matchId_playerId: {
          matchId: id,
          playerId: match.player2Id!,
        }
      },
      create: {
        matchId: id,
        playerId: match.player2Id!,
        score: player2Score,
        won: winnerId === match.player2Id,
      },
      update: {
        score: player2Score,
        won: winnerId === match.player2Id,
      },
    });

    // Advance winner to next match (single elimination)
    if (match.tournament.format === 'SINGLE_ELIMINATION') {
      await advanceWinner(match.id, winnerId, match.tournamentId, match.round, match.matchNumber);
    }

    // Create notification for the loser
    const loserId = winnerId === match.player1Id ? match.player2Id : match.player1Id;
    if (loserId) {
      await prisma.notification.create({
        data: {
          userId: loserId,
          type: 'MATCH_COMPLETED',
          title: 'Match Result',
          message: `You lost in ${match.tournament.name}`,
        }
      });
    }

    res.json({ match: updated });
  } catch (error) {
    console.error('Submit result error:', error);
    res.status(500).json({ error: 'Failed to submit result' });
  }
});

// Helper function to advance winner
async function advanceWinner(
  matchId: string,
  winnerId: string,
  tournamentId: string,
  round: number,
  matchNumber: number
) {
  // Get next round matches
  const nextRound = round + 1;
  const nextMatchPosition = Math.floor(matchNumber / 2);
  
  const nextMatch = await prisma.match.findFirst({
    where: {
      tournamentId,
      round: nextRound,
      position: nextMatchPosition,
    },
  });

  if (nextMatch) {
    // Determine if player 1 or player 2
    const isPlayer1Slot = matchNumber % 2 === 1;
    
    await prisma.match.update({
      where: { id: nextMatch.id },
      data: {
        [isPlayer1Slot ? 'player1Id' : 'player2Id']: winnerId,
        status: nextMatch.player1Id && nextMatch.player2Id ? 'READY' : 'PENDING',
      },
    });
  } else {
    // Tournament complete - declare winner
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: 'COMPLETED' },
    });

    // Notify winner
    await prisma.notification.create({
      data: {
        userId: winnerId,
        type: 'TOURNAMENT_WIN',
        title: 'Tournament Won!',
        message: 'Congratulations! You won the tournament!',
      }
    });
  }
}

// Start match
router.post('/:id/start', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const match = await prisma.match.findUnique({
      where: { id },
      include: { tournament: true },
    });

    if (!match) {
      res.status(404).json({ error: 'Match not found' });
      return;
    }

    const isOrganizer = match.tournament.organizerId === userId;
    const isAdmin = req.user!.role === 'ADMIN';

    if (!isOrganizer && !isAdmin) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const updated = await prisma.match.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    });

    // Notify players
    const playerIds = [match.player1Id, match.player2Id].filter(Boolean) as string[];
    await prisma.notification.createMany({
      data: playerIds.map(playerId => ({
        userId: playerId,
        type: 'MATCH_STARTED',
        title: 'Match Started',
        message: `Your match in ${match.tournament.name} has started!`,
      }))
    });

    res.json({ match: updated });
  } catch (error) {
    console.error('Start match error:', error);
    res.status(500).json({ error: 'Failed to start match' });
  }
});

// Dispute match
router.post('/:id/dispute', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { reason } = req.body;

    const match = await prisma.match.findUnique({
      where: { id },
      include: { tournament: true },
    });

    if (!match) {
      res.status(404).json({ error: 'Match not found' });
      return;
    }

    // Check if user is participant
    const isParticipant = match.player1Id === userId || match.player2Id === userId;
    if (!isParticipant) {
      res.status(403).json({ error: 'Only participants can dispute' });
      return;
    }

    const updated = await prisma.match.update({
      where: { id },
      data: { status: 'DISPUTED' },
    });

    // Notify organizer
    await prisma.notification.create({
      data: {
        userId: match.tournament.organizerId,
        type: 'MATCH_DISPUTED',
        title: 'Match Dispute',
        message: `A match in ${match.tournament.name} has been disputed: ${reason}`,
      }
    });

    res.json({ match: updated, message: 'Dispute submitted' });
  } catch (error) {
    console.error('Dispute error:', error);
    res.status(500).json({ error: 'Failed to submit dispute' });
  }
});

// Resolve dispute (organizer or admin)
router.post('/:id/resolve', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { winnerId, cancelMatch } = req.body;

    const match = await prisma.match.findUnique({
      where: { id },
      include: { tournament: true },
    });

    if (!match) {
      res.status(404).json({ error: 'Match not found' });
      return;
    }

    const isOrganizer = match.tournament.organizerId === userId;
    const isAdmin = req.user!.role === 'ADMIN';

    if (!isOrganizer && !isAdmin) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    if (cancelMatch) {
      await prisma.match.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });
    } else {
      await prisma.match.update({
        where: { id },
        data: {
          winnerId,
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
    }

    res.json({ message: 'Dispute resolved' });
  } catch (error) {
    console.error('Resolve dispute error:', error);
    res.status(500).json({ error: 'Failed to resolve dispute' });
  }
});

// Get tournament matches
router.get('/tournament/:tournamentId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tournamentId } = req.params;

    const matches = await prisma.match.findMany({
      where: { tournamentId },
      include: {
        player1: { select: { id: true, username: true, avatar: true } },
        player2: { select: { id: true, username: true, avatar: true } },
        winner: { select: { id: true, username: true, avatar: true } },
      },
      orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }],
    });

    res.json({ matches });
  } catch (error) {
    console.error('Get tournament matches error:', error);
    res.status(500).json({ error: 'Failed to get matches' });
  }
});

export default router;
