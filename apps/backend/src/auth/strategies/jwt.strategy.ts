import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Role } from "@prisma/client";
import { Request } from "express";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AuthUser } from "../../common/decorators/current-user.decorator";
import { UsersService } from "../../users/users.service";
import { ACCESS_TOKEN_COOKIE } from "../auth.constants";

interface AccessPayload {
  sub: string;
  email: string;
  role: Role;
}

function cookieExtractor(request: Request): string | null {
  const cookies = (request as Request & { cookies?: Record<string, string> })
    .cookies;
  return cookies?.[ACCESS_TOKEN_COOKIE] ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly users: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("JWT_ACCESS_SECRET"),
    });
  }

  async validate(payload: AccessPayload): Promise<AuthUser> {
    const user = await this.users.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException({
        code: "UNAUTHENTICATED",
        message: "Session is no longer valid",
      });
    }
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }
}
