import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Request, Response } from "express";
import {
  AuthUser,
  CurrentUser,
} from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_COOKIE_PATH,
  REFRESH_TOKEN_COOKIE,
} from "./auth.constants";
import { AuthService, AuthTokens } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("register")
  @ApiOperation({ summary: "Register a STAFF account and start a session" })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.authService.register(dto);
    this.setCookies(response, session.tokens);
    return session.user;
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Log in with email and password" })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.authService.login(dto);
    this.setCookies(response, session.tokens);
    return session.user;
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Rotate the access and refresh tokens" })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.authService.refresh(this.refreshCookie(request));
    this.setCookies(response, session.tokens);
    return { authenticated: true };
  }

  @Public()
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Clear the session cookies" })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(this.refreshCookie(request));
    this.clearCookies(response);
    return { authenticated: false };
  }

  @Get("me")
  @ApiOperation({ summary: "Return the currently authenticated user" })
  me(@CurrentUser() user: AuthUser) {
    return this.authService.me(user.id);
  }

  private refreshCookie(request: Request): string | undefined {
    const cookies = (request as Request & { cookies?: Record<string, string> })
      .cookies;
    return cookies?.[REFRESH_TOKEN_COOKIE];
  }

  private setCookies(response: Response, tokens: AuthTokens): void {
    const secure = this.config.get<boolean>("COOKIE_SECURE") ?? false;
    response.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: tokens.accessMaxAgeMs,
    });
    response.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: REFRESH_COOKIE_PATH,
      maxAge: tokens.refreshMaxAgeMs,
    });
  }

  private clearCookies(response: Response): void {
    const secure = this.config.get<boolean>("COOKIE_SECURE") ?? false;
    const base = { httpOnly: true, sameSite: "lax" as const, secure };
    response.clearCookie(ACCESS_TOKEN_COOKIE, { ...base, path: "/" });
    response.clearCookie(REFRESH_TOKEN_COOKIE, {
      ...base,
      path: REFRESH_COOKIE_PATH,
    });
  }
}
