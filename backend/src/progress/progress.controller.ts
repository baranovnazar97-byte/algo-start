import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CompleteLevelDto } from './dto/complete-level.dto';
import { ProgressService } from './progress.service';

@Controller('progress')
@UseGuards(JwtAuthGuard)
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get()
  getProgress(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.progressService.getProgress(currentUser.id);
  }

  @Post('complete')
  complete(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CompleteLevelDto,
  ) {
    return this.progressService.complete(currentUser.id, dto);
  }
}
