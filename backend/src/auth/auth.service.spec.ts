import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash } from 'bcryptjs';
import { DatabaseService } from '../database/database.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const userRow = {
    id: '7',
    name: 'Аня',
    email: 'anya@example.com',
    password_hash: '',
    total_score: 120,
    created_at: new Date('2026-01-01T00:00:00.000Z'),
  };

  let query: jest.Mock;
  let signAsync: jest.Mock;
  let service: AuthService;

  beforeEach(() => {
    query = jest.fn();
    signAsync = jest.fn().mockResolvedValue('signed-token');
    service = new AuthService(
      { query } as unknown as DatabaseService,
      { signAsync } as unknown as JwtService,
    );
  });

  it('регистрирует пользователя, хеширует пароль и не возвращает хеш', async () => {
    query.mockResolvedValue({ rows: [userRow] });

    const result = await service.register({
      name: 'Аня',
      email: 'anya@example.com',
      password: 'secret12',
    });

    const values = query.mock.calls[0][1] as string[];
    expect(values[0]).toBe('Аня');
    expect(values[1]).toBe('anya@example.com');
    expect(values[2]).not.toBe('secret12');
    expect(result).toEqual({
      token: 'signed-token',
      user: {
        id: '7',
        name: 'Аня',
        email: 'anya@example.com',
        totalScore: 120,
        createdAt: userRow.created_at,
      },
    });
    expect(result.user).not.toHaveProperty('password_hash');
  });

  it('возвращает понятную ошибку при повторном email', async () => {
    query.mockRejectedValue({ code: '23505' });

    await expect(
      service.register({ name: 'Аня', email: 'anya@example.com', password: 'secret12' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('выполняет вход с правильным паролем', async () => {
    const passwordHash = await hash('secret12', 4);
    query.mockResolvedValue({ rows: [{ ...userRow, password_hash: passwordHash }] });

    const result = await service.login({ email: 'anya@example.com', password: 'secret12' });

    expect(result.token).toBe('signed-token');
    expect(signAsync).toHaveBeenCalledWith({ sub: '7', email: 'anya@example.com' });
  });

  it('не раскрывает, email или пароль были неверными', async () => {
    query.mockResolvedValue({ rows: [] });

    await expect(
      service.login({ email: 'nobody@example.com', password: 'incorrect' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
