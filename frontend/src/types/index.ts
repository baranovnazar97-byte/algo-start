export type GameCode = 'sequence' | 'robot' | 'debugger' | 'conditions';

export interface User {
  id: number | string;
  name: string;
  email: string;
  totalScore?: number;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface CompleteLevelPayload {
  gameCode: GameCode;
  level: number;
  score: number;
  maxScore: number;
}

export interface ProgressRecord {
  gameCode: GameCode;
  level: number;
  score: number;
  maxScore: number;
  completedAt?: string;
}

export interface ProgressSummary {
  totalScore: number;
  completedLevels: ProgressRecord[];
  unlockedGames: GameCode[];
}

export interface GameInfo {
  code: GameCode;
  title: string;
  shortTitle: string;
  description: string;
  color: 'purple' | 'blue' | 'orange' | 'green';
  path: string;
}
