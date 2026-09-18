import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { Observable } from "rxjs";

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const existing = request.header("x-request-id");
    const requestId = existing && existing.length > 0 ? existing : randomUUID();
    request.headers["x-request-id"] = requestId;
    response.setHeader("X-Request-Id", requestId);
    return next.handle();
  }
}
