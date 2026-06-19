import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { RowDataPacket } from 'mysql2';
import type { Pool } from 'mysql2/promise';
import { MYSQL_POOL } from '../database/database.constants';
import { LoginDto } from './dto/login.dto';

export interface AuthUserRow extends RowDataPacket {
  id: number;
  username: string;
}

export interface LoginResponse {
  user: AuthUserRow;
  accessToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(MYSQL_POOL) private readonly mysqlPool: Pool,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto): Promise<LoginResponse> {
    const user = await this.validateUser(loginDto);
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      username: user.username,
    });

    return { user, accessToken };
  }

  private async validateUser(loginDto: LoginDto): Promise<AuthUserRow> {
    const [rows] = await this.mysqlPool.execute<AuthUserRow[]>(
      `
        SELECT id, username
        FROM monitoring_auth
        WHERE username = :username
          AND password = :password
        LIMIT 1
      `,
      {
        username: loginDto.username,
        password: loginDto.password,
      },
    );

    const user = rows[0];

    if (!user) {
      throw new UnauthorizedException('Invalid username or password.');
    }

    return user;
  }
}
