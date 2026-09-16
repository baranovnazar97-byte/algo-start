import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AuthenticatedUser, JwtPayload } from './auth.types';

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [type, token] = request.headers.authorization?.split(' ') ?? [];

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Необходимо войти в аккаунт');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      if (!payload.sub || !payload.email) throw new Error('Invalid payload');
      request.user = { id: String(payload.sub), email: payload.email };
      return true;
    } catch {
      throw new UnauthorizedException('Сессия недействительна или завершена');
    }
  }
}
