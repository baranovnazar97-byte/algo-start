import { BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ProgressService } from './progress.service';

describe('ProgressService', () => {
  let query: jest.Mock;
  let transaction: jest.Mock;
  let service: ProgressService;

  beforeEach(() => {
    query = jest.fn();
    transaction = jest.fn();
    service = new ProgressService({ query, transaction } as unknown as DatabaseService);
  });

  it('собирает список прогресса и открытых игр', async () => {
    query
      .mockResolvedValueOnce({
        rows: [
          {
            game_code: 'sequence',
            level: 3,
            score: 80,
            max_score: 100,
            completed_at: new Date('2026-01-02T00:00:00.000Z'),
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ total_score: 80 }] });

    const result = await service.getProgress('7');

    expect(result.totalScore).toBe(80);
    expect(result.completedCount).toBe(1);
    expect(result.unlockedGames).toEqual(['sequence', 'robot']);
    expect(result.completedLevels[0]).toMatchObject({
      gameCode: 'sequence',
      level: 3,
      score: 80,
      maxScore: 100,
    });
    expect(result.progress).toEqual(result.completedLevels);
  });

  it('начисляет только разницу между новым и прежним рекордом', async () => {
    const clientQuery = jest
      .fn()
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ '?column?': 1 }] })
      .mockResolvedValueOnce({ rows: [{ id: '11', max_score: 100, order_no: 1 }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rows: [{ best_score: 60 }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });
    transaction.mockImplementation(async (work: (client: unknown) => Promise<unknown>) =>
      work({ query: clientQuery }),
    );
    query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total_score: 80 }] });

    await service.complete('7', {
      gameCode: 'sequence',
      level: 1,
      score: 80,
      maxScore: 100,
    });

    expect(clientQuery).toHaveBeenNthCalledWith(
      6,
      expect.stringContaining('UPDATE users'),
      [20, '7'],
    );
  });

  it('не принимает результат ниже проходного балла', async () => {
    const clientQuery = jest
      .fn()
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ '?column?': 1 }] })
      .mockResolvedValueOnce({ rows: [{ id: '11', max_score: 100, order_no: 1 }] });
    transaction.mockImplementation(async (work: (client: unknown) => Promise<unknown>) =>
      work({ query: clientQuery }),
    );

    await expect(
      service.complete('7', {
        gameCode: 'sequence',
        level: 1,
        score: 49,
        maxScore: 100,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(query).not.toHaveBeenCalled();
  });

  it('не даёт открыть следующую игру раньше времени', async () => {
    const clientQuery = jest
      .fn()
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ '?column?': 1 }] })
      .mockResolvedValueOnce({ rows: [{ id: '14', max_score: 100, order_no: 2 }] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });
    transaction.mockImplementation(async (work: (client: unknown) => Promise<unknown>) =>
      work({ query: clientQuery }),
    );

    await expect(
      service.complete('7', {
        gameCode: 'robot',
        level: 1,
        score: 100,
        maxScore: 100,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
