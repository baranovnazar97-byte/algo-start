import { useCallback, useState } from 'react';
import { useProgress } from '../context/ProgressContext';
import type { GameCode } from '../types';

export function useLevelCompletion(gameCode: GameCode, level: number) {
  const { completeLevel } = useProgress();
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [score, setScore] = useState(0);

  const save = useCallback(
    async (earnedScore: number) => {
      setScore(earnedScore);
      setStatus('saving');
      try {
        await completeLevel({ gameCode, level, score: earnedScore, maxScore: 100 });
        setStatus('saved');
      } catch {
        setStatus('error');
      }
    },
    [completeLevel, gameCode, level],
  );

  return { status, score, save };
}
