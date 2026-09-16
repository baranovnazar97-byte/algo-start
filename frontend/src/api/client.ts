import type {
  AuthResponse,
  CompleteLevelPayload,
  GameCode,
  ProgressRecord,
  ProgressSummary,
  User,
} from '../types';

const API_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');
const TOKEN_KEY = 'algostart_token';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = tokenStorage.get();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const contentType = response.headers.get('content-type') ?? '';
  const body: unknown = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text();

  if (!response.ok) {
    const message =
      typeof body === 'object' && body !== null && 'message' in body
        ? Array.isArray(body.message)
          ? body.message.join('. ')
          : String(body.message)
        : 'Не получилось связаться с сервером. Попробуй ещё раз.';
    throw new ApiError(message, response.status);
  }

  return body as T;
}

function normalizeUser(raw: Record<string, unknown>): User {
  const user = ('user' in raw && typeof raw.user === 'object' && raw.user
    ? raw.user
    : raw) as Record<string, unknown>;
  return {
    id: String(user.id ?? user.userId ?? ''),
    name: String(user.name ?? user.displayName ?? 'Игрок'),
    email: String(user.email ?? user.username ?? user.login ?? ''),
    totalScore: user.totalScore === undefined ? undefined : Number(user.totalScore),
    createdAt: user.createdAt ? String(user.createdAt) : undefined,
  };
}

function normalizeAuth(raw: Record<string, unknown>): AuthResponse {
  const token = raw.accessToken ?? raw.token ?? raw.access_token;
  if (!token) throw new ApiError('Сервер не вернул ключ входа.', 500);
  return { token: String(token), user: normalizeUser(raw) };
}

export const authApi = {
  async register(data: { name: string; email: string; password: string }) {
    const raw = await request<Record<string, unknown>>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return normalizeAuth(raw);
  },

  async login(data: { email: string; password: string }) {
    const raw = await request<Record<string, unknown>>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return normalizeAuth(raw);
  },

  async me() {
    const raw = await request<Record<string, unknown>>('/auth/me');
    return normalizeUser(raw);
  },
};

const isGameCode = (value: unknown): value is GameCode =>
  ['sequence', 'robot', 'debugger', 'conditions'].includes(String(value));

function normalizeRecords(raw: unknown): ProgressRecord[] {
  const source = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object'
      ? ((raw as Record<string, unknown>).items ??
        (raw as Record<string, unknown>).progress ??
        (raw as Record<string, unknown>).records ??
        (raw as Record<string, unknown>).completedLevels ??
        [])
      : [];

  if (!Array.isArray(source)) return [];
  return source.flatMap((item): ProgressRecord[] => {
    if (!item || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>;
    const gameCode = record.gameCode ?? record.game_code ?? record.code;
    if (!isGameCode(gameCode)) return [];
    const level = Number(record.level ?? record.completedLevel ?? 0);
    if (!Number.isFinite(level) || level < 1) return [];
    return [
      {
        gameCode,
        level,
        score: Number(record.score ?? record.bestScore ?? 0),
        maxScore: Number(record.maxScore ?? record.max_score ?? 100),
        completedAt: record.completedAt ? String(record.completedAt) : undefined,
      },
    ];
  });
}

function normalizeSummary(raw: unknown): ProgressSummary {
  const object = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const completedLevels = normalizeRecords(raw);
  const unlockedRaw = Array.isArray(object.unlockedGames) ? object.unlockedGames : [];
  const unlockedGames = unlockedRaw.filter(isGameCode);

  return {
    totalScore:
      object.totalScore === undefined
        ? completedLevels.reduce((sum, item) => sum + item.score, 0)
        : Number(object.totalScore),
    completedLevels,
    unlockedGames: unlockedGames.length > 0 ? unlockedGames : ['sequence'],
  };
}

export const progressApi = {
  async getAll() {
    const raw = await request<unknown>('/progress');
    return normalizeSummary(raw);
  },

  async complete(payload: CompleteLevelPayload) {
    const raw = await request<unknown>('/progress/complete', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return normalizeSummary(raw);
  },
};
