import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";

const DEFAULT_CODES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: "BAD_REQUEST",
  [HttpStatus.UNAUTHORIZED]: "UNAUTHENTICATED",
  [HttpStatus.FORBIDDEN]: "FORBIDDEN",
  [HttpStatus.NOT_FOUND]: "NOT_FOUND",
  [HttpStatus.CONFLICT]: "CONFLICT",
  [HttpStatus.UNPROCESSABLE_ENTITY]: "UNPROCESSABLE_ENTITY",
  [HttpStatus.TOO_MANY_REQUESTS]: "TOO_MANY_REQUESTS",
  [HttpStatus.INTERNAL_SERVER_ERROR]: "INTERNAL_ERROR",
};

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId: string;
  };
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { id?: string }>();
    const requestId = request.id ?? randomUUID();
    response.setHeader("X-Request-Id", requestId);

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = "";
    let message = "Internal server error";
    let details: unknown;

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const mapped = this.mapPrismaError(exception);
      status = mapped.status;
      code = mapped.code;
      message = mapped.message;
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      code = "VALIDATION_FAILED";
      message = "Invalid data provided";
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === "string") {
        message = body;
      } else if (body && typeof body === "object") {
        const payload = body as Record<string, unknown>;
        code =
          typeof payload.code === "string"
            ? payload.code
            : (DEFAULT_CODES[status] ?? "ERROR");
        if (Array.isArray(payload.message)) {
          message = "Request validation failed";
          details = payload.details ?? payload.message;
        } else if (typeof payload.message === "string") {
          message = payload.message;
        } else if (typeof payload.error === "string") {
          message = payload.error;
        }
        if (payload.details !== undefined) details = payload.details;
      }
      if (code === "ERROR" || code === "")
        code = DEFAULT_CODES[status] ?? "INTERNAL_ERROR";
      if (
        status === HttpStatus.TOO_MANY_REQUESTS &&
        message.includes("Throttler")
      ) {
        message = "Too many requests, please try again later";
      }
    } else if (exception instanceof Error) {
      const httpStatus =
        (exception as Error & { status?: number; statusCode?: number })
          .status ?? (exception as Error & { statusCode?: number }).statusCode;
      if (
        typeof httpStatus === "number" &&
        httpStatus >= 400 &&
        httpStatus < 500
      ) {
        status = httpStatus;
        code = DEFAULT_CODES[status] ?? "BAD_REQUEST";
        message =
          status === HttpStatus.BAD_REQUEST
            ? "Malformed request"
            : exception.message;
      } else {
        message = "Internal server error";
      }
    }

    if (!code) code = DEFAULT_CODES[status] ?? "INTERNAL_ERROR";

    if (status >= 500) {
      this.logger.error(
        { requestId, path: request.url, err: exception },
        "Unhandled exception",
      );
    }

    const body: ErrorResponse = {
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
        requestId,
      },
    };

    response.status(status).json(body);
  }

  private mapPrismaError(error: Prisma.PrismaClientKnownRequestError): {
    status: number;
    code: string;
    message: string;
  } {
    switch (error.code) {
      case "P2002": {
        const target = Array.isArray(error.meta?.target)
          ? (error.meta?.target as string[]).join(", ")
          : "unique field";
        return {
          status: HttpStatus.CONFLICT,
          code: "UNIQUE_CONSTRAINT_VIOLATED",
          message: `A record with this ${target} already exists`,
        };
      }
      case "P2025":
        return {
          status: HttpStatus.NOT_FOUND,
          code: "NOT_FOUND",
          message: "The requested record was not found",
        };
      case "P2003":
        return {
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          code: "RELATED_RECORD_NOT_FOUND",
          message: "A referenced record does not exist",
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          code: "INTERNAL_ERROR",
          message: "Internal server error",
        };
    }
  }
}
