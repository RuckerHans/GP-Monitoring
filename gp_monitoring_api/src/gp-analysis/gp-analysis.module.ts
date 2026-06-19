import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BranchesModule } from '../branches/branches.module';
import { GpAnalysisController } from './gp-analysis.controller';
import { GpAnalysisService } from './gp-analysis.service';

@Module({
  imports: [AuthModule, BranchesModule],
  controllers: [GpAnalysisController],
  providers: [GpAnalysisService],
})
export class GpAnalysisModule {}
