import { Controller, Get, Param } from '@nestjs/common';
import { GamesService } from './games.service';

@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Get()
  findAll() {
    return this.gamesService.findAll();
  }

  @Get(':code')
  findOne(@Param('code') code: string) {
    return this.gamesService.findOne(code);
  }
}
