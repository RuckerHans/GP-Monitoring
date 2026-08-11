import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GpAnalysisService } from './gp-analysis.service';

@Controller('gp-analysis')
@UseGuards(JwtAuthGuard)
export class GpAnalysisController {
  constructor(private readonly gpAnalysisService: GpAnalysisService) {}

  @Get('daily')
  findDailyAnalysis(@Query('date') date?: string) {
    return this.gpAnalysisService.findDailyAnalysis(date);
  }

  @Get('monthly')
  findMonthlyAnalysis(@Query('month') month?: string) {
    return this.gpAnalysisService.findMonthlyAnalysis(month);
  }
}
