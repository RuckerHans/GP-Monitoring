import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BranchesModule } from './branches/branches.module';
import { ApiKeyGuard } from './common/guards/api-key.guard';
import { DatabaseModule } from './database/database.module';
import { GpAnalysisModule } from './gp-analysis/gp-analysis.module';

@Module({
  imports: [DatabaseModule, AuthModule, BranchesModule, GpAnalysisModule],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
  ],
})
export class AppModule {}
