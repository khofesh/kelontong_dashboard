import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Role, User } from "@prisma/client";
import * as argon2 from "argon2";
import { PublicUser, toPublicUser } from "../users/user.mapper";
import { UsersService } from "../users/users.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

interface RefreshPayload {
  sub: string;
  email: string;
  role: Role;
  type: "refresh";
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessMaxAgeMs: number;
  refreshMaxAgeMs: number;
}

export interface Session {
  user: PublicUser;
  tokens: AuthTokens;
}

function ttlToMs(ttl: string): number {
  const match = /^(\d+)(ms|s|m|h|d)$/.exec(ttl);
  if (!match) throw new Error(`Invalid TTL format: ${ttl}`);
  const amount = Number(match[1]);
  const unit = match[2];
  const factors: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return amount * factors[unit];
}

const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=65536,t=3,p=4$YL7Z7Shrdj/bMjJfxldFCA$NORMkNUqnOCOlvd3L03hxAOraOQmsMKdtSn4Xjc91cc";

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<Session> {
    let user: User;
    try {
      user = await this.users.create({
        email: dto.email,
        name: dto.name,
        passwordHash: await argon2.hash(dto.password),
        role: Role.STAFF,
      });
    } catch (error) {
      if (this.users.isUniqueConstraintError(error)) {
        throw new ConflictException({
          code: "EMAIL_ALREADY_REGISTERED",
          message: "This email is already registered",
        });
      }
      throw error;
    }
    return this.createSession(user);
  }

  async login(dto: LoginDto): Promise<Session> {
    const user = await this.users.findByEmail(dto.email);
    const invalid = new UnauthorizedException({
      code: "INVALID_CREDENTIALS",
      message: "Email or password is incorrect",
    });
    if (!user) {
      await argon2.verify(DUMMY_PASSWORD_HASH, dto.password).catch(() => false);
      throw invalid;
    }
    if (!(await argon2.verify(user.passwordHash, dto.password))) throw invalid;
    return this.createSession(user);
  }

  async refresh(refreshToken: string | undefined): Promise<Session> {
    if (!refreshToken) throw this.invalidRefresh();
    let payload: RefreshPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
      });
    } catch {
      throw this.invalidRefresh();
    }
    if (payload.type !== "refresh") throw this.invalidRefresh();

    const user = await this.users.findById(payload.sub);
    if (!user?.refreshTokenHash) throw this.invalidRefresh();
    const matches = await argon2.verify(user.refreshTokenHash, refreshToken);
    if (!matches) throw this.invalidRefresh();

    // rotation
    return this.createSession(user);
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    try {
      const payload = await this.jwt.verifyAsync<RefreshPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
      });
      if (payload.type === "refresh") {
        await this.users.setRefreshTokenHash(payload.sub, null);
      }
    } catch {
      //
    }
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UnauthorizedException({
        code: "UNAUTHENTICATED",
        message: "Session is no longer valid",
      });
    }
    return toPublicUser(user);
  }

  private async createSession(user: User): Promise<Session> {
    const accessTtl = this.config.getOrThrow<string>("JWT_ACCESS_TTL");
    const refreshTtl = this.config.getOrThrow<string>("JWT_REFRESH_TTL");
    const payload = { sub: user.id, email: user.email, role: user.role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
        expiresIn: Math.floor(ttlToMs(accessTtl) / 1000),
      }),
      this.jwt.signAsync(
        { ...payload, type: "refresh" },
        {
          secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
          expiresIn: Math.floor(ttlToMs(refreshTtl) / 1000),
        },
      ),
    ]);

    await this.users.setRefreshTokenHash(
      user.id,
      await argon2.hash(refreshToken),
    );

    return {
      user: toPublicUser(user),
      tokens: {
        accessToken,
        refreshToken,
        accessMaxAgeMs: ttlToMs(accessTtl),
        refreshMaxAgeMs: ttlToMs(refreshTtl),
      },
    };
  }

  private invalidRefresh(): UnauthorizedException {
    return new UnauthorizedException({
      code: "UNAUTHENTICATED",
      message: "Refresh token is invalid or expired",
    });
  }
}
