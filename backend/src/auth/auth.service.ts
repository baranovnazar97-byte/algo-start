import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { DatabaseService } from '../database/database.service';
import { JwtPayload, PublicUser } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  total_score: number;
  created_at: Date;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly database: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<{ token: string; user: PublicUser }> {
    const passwordHash = await hash(dto.password, 10);

    try {
      const result = await this.database.query<UserRow>(
        `INSERT INTO users (name, email, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, name, email, password_hash, total_score, created_at`,
        [dto.name, dto.email, passwordHash],
      );
      return this.createAuthResponse(result.rows[0]);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Пользователь с таким email уже зарегистрирован');
      }
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<{ token: string; user: PublicUser }> {
    const result = await this.database.query<UserRow>(
      `SELECT id, name, email, password_hash, total_score, created_at
       FROM users
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      [dto.email],
    );
    const user = result.rows[0];

    if (!user || !(await compare(dto.password, user.password_hash))) {
      throw new UnauthorizedException('Неверный email или пароль');
    }
    return this.createAuthResponse(user);
  }

  async getProfile(userId: string): Promise<PublicUser> {
    const result = await this.database.query<UserRow>(
      `SELECT id, name, email, password_hash, total_score, created_at
       FROM users
       WHERE id = $1`,
      [userId],
    );
    const user = result.rows[0];
    if (!user) throw new UnauthorizedException('Пользователь не найден');
    return this.toPublicUser(user);
  }

  private async createAuthResponse(user: UserRow): Promise<{ token: string; user: PublicUser }> {
    const payload: JwtPayload = { sub: String(user.id), email: user.email };
    return {
      token: await this.jwtService.signAsync(payload),
      user: this.toPublicUser(user),
    };
  }

  private toPublicUser(user: UserRow): PublicUser {
    return {
      id: String(user.id),
      name: user.name,
      email: user.email,
      totalScore: Number(user.total_score),
      createdAt: user.created_at,
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    return Boolean(error && typeof error === 'object' && 'code' in error && error.code === '23505');
  }
}
