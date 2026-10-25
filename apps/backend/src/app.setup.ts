import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import cookieParser from "cookie-parser";
import { json, urlencoded } from "express";
import helmet from "helmet";
import { flattenValidationErrors } from "./common/pipes/validation-exception.factory";

export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService);
  const origins = (
    config.get<string>("FRONTEND_ORIGIN") ?? "http://localhost:3000"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cookieParser());
  app.use(json({ limit: "1mb" }));
  app.use(urlencoded({ extended: true, limit: "1mb" }));
  app.enableCors({ origin: origins, credentials: true });

  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new BadRequestException({
          code: "VALIDATION_FAILED",
          message: "Request validation failed",
          details: flattenValidationErrors(errors),
        }),
    }),
  );
}
