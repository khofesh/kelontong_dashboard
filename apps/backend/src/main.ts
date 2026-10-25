import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { configureApp } from "./app.setup";
import { ACCESS_TOKEN_COOKIE } from "./auth/auth.constants";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  const config = app.get(ConfigService);

  if (config.get<string>("NODE_ENV") !== "production") {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle("Kelontong Dashboard API")
        .setVersion("1.0")
        .addCookieAuth(ACCESS_TOKEN_COOKIE)
        .build(),
    );
    SwaggerModule.setup("api/docs", app, document);
  }

  await app.listen(config.getOrThrow<number>("PORT"));
}
bootstrap();
