import { Body, Controller, Post, Res, HttpStatus, Req } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { ApiTags } from '@nestjs/swagger';
import { RefreshDto } from './dto/refresh.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sign-in')
  async signIn(@Body() dto: SignInDto, @Res() res: Response) {
    const tokens = await this.authService.signIn(dto);
    return res.json(tokens);
  }

  @Post('sign-up')
  async signUp(@Body() dto: SignUpDto, @Res() res: Response) {
    const tokens = await this.authService.signUp(dto);
    return res.json(tokens);
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    const tokens = await this.authService.refresh(dto.refreshToken);
    return tokens;
  }

  @Post('sign-out')
  async signOut(@Res() res: Response) {
    res.clearCookie('refreshToken');
    res.clearCookie('accessToken');
    return res.sendStatus(HttpStatus.OK);
  }
}
