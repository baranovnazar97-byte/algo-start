import { Type } from 'class-transformer';
import { IsIn, IsInt, Max, Min } from 'class-validator';
import { GAME_CODES, GameCode } from '../../games/game-seeds';

export class CompleteLevelDto {
  @IsIn(GAME_CODES)
  gameCode!: GameCode;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  level!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000)
  score!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000)
  maxScore!: number;
}
