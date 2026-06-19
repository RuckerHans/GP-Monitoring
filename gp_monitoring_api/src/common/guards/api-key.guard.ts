import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { appConfig } from '../../config/app.config';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.header('x-api-key');

    if (!apiKey || apiKey !== appConfig.apiKey) {
      throw new UnauthorizedException('Invalid API key.');
    }

    return true;
  }
}
