import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, map } from "rxjs";

/**
 * wraps every successful response in `{ data }`.
 */
@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      map((value) => {
        if (value === undefined || value === null) return value;
        if (
          typeof value === "object" &&
          "data" in (value as object) &&
          "meta" in (value as object)
        ) {
          return value;
        }
        return { data: value };
      }),
    );
  }
}
