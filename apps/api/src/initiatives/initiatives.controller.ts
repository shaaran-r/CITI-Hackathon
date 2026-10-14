import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { InitiativeSource } from '@kaushalsetu/types';
import { Public } from '../common/public.decorator.js';
import { InitiativesService } from './initiatives.service.js';

@ApiTags('learning sources')
@Controller('sources')
export class InitiativesController {
  constructor(private readonly initiatives: InitiativesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List official education and livelihood reference portals' })
  list(): InitiativeSource[] {
    return this.initiatives.list();
  }
}
