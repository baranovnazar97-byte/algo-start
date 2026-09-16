import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ApiError, progressApi } from '../api/client';
import type { CompleteLevelPayload, GameCode, ProgressRecord } from '../types';
import { useAuth } from './AuthContext';

interface ProgressContextValue {
  records: ProgressRecord[];
  isLoading: boolean;
  error: string;
  totalScore: number;
  completedCount: number;
  bestFor: (gameCode: GameCode, level: number) => ProgressRecord | undefined;
  isLevelUnlocked: (gameCode: GameCode, level: number) => boolean;
  isGameUnlocked: (gameCode: GameCode) => boolean;
  completeLevel: (payload: CompleteLevelPayload) => Promise<void>;
  refresh: () => Promise<void>;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);
const GAME_ORDER: GameCode[] = ['sequence', 'robot', 'debugger', 'conditions'];

export function ProgressProvider({ children }: PropsWithChildren) {
  const { isAuthenticated, logout } = useAuth();
  const [records, setRecords] = useState<ProgressRecord[]>([]);
  const [serverTotalScore, setServerTotalScore] = useState(0);
  const [serverUnlockedGames, setServerUnlockedGames] = useState<GameCode[]>(['sequence']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setRecords([]);
      setServerTotalScore(0);
      setServerUnlockedGames(['sequence']);
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const summary = await progressApi.getAll();
      setRecords(summary.completedLevels);
      setServerTotalScore(summary.totalScore);
      setServerUnlockedGames(summary.unlockedGames);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        logout();
        setError('Сессия завершилась. Войди снова, чтобы продолжить.');
      } else {
        setError('Не удалось загрузить прогресс. Проверь соединение и обнови страницу.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, logout]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const bestFor = useCallback(
    (gameCode: GameCode, level: number) =>
      records
        .filter((record) => record.gameCode === gameCode && record.level === level)
        .sort((a, b) => b.score - a.score)[0],
    [records],
  );

  const isLevelUnlocked = useCallback(
    (gameCode: GameCode, level: number) =>
      level === 1 || Boolean(bestFor(gameCode, level - 1)),
    [bestFor],
  );

  const isGameUnlocked = useCallback(
    (gameCode: GameCode) => {
      const index = GAME_ORDER.indexOf(gameCode);
      return (
        index <= 0 ||
        serverUnlockedGames.includes(gameCode) ||
        Boolean(bestFor(GAME_ORDER[index - 1], 3))
      );
    },
    [bestFor, serverUnlockedGames],
  );

  const completeLevel = useCallback(
    async (payload: CompleteLevelPayload) => {
      try {
        const summary = await progressApi.complete(payload);
        setServerTotalScore(summary.totalScore);
        setServerUnlockedGames(summary.unlockedGames);
        if (summary.completedLevels.length > 0) {
          setRecords(summary.completedLevels);
          return;
        }
        setRecords((current) => {
          const same = current.find(
            (item) => item.gameCode === payload.gameCode && item.level === payload.level,
          );
          if (same && same.score >= payload.score) return current;
          const withoutOld = current.filter(
            (item) => !(item.gameCode === payload.gameCode && item.level === payload.level),
          );
          return [...withoutOld, { ...payload, completedAt: new Date().toISOString() }];
        });
      } catch (requestError) {
        if (requestError instanceof ApiError && requestError.status === 401) logout();
        throw requestError;
      }
    },
    [logout],
  );

  const value = useMemo<ProgressContextValue>(() => {
    return {
      records,
      isLoading,
      error,
      totalScore: serverTotalScore || records.reduce((sum, record) => sum + record.score, 0),
      completedCount: new Set(records.map((item) => `${item.gameCode}-${item.level}`)).size,
      bestFor,
      isLevelUnlocked,
      isGameUnlocked,
      completeLevel,
      refresh,
    };
  }, [bestFor, error, isGameUnlocked, isLevelUnlocked, isLoading, records, refresh, completeLevel, serverTotalScore]);

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const context = useContext(ProgressContext);
  if (!context) throw new Error('useProgress должен использоваться внутри ProgressProvider');
  return context;
}
