import { NestFactory } from '@nestjs/core';
import session from 'express-session';
import { AppModule } from './app.module';
import { appConfig } from './config/app.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: appConfig.corsOrigins,
    credentials: true,
    allowedHeaders: ['content-type', 'authorization', 'x-api-key'],
  });

  app.use(
    session({
      name: 'gp_monitoring.sid',
      secret: appConfig.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
      },
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
