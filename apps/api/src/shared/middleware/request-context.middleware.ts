import { Injectable, NestMiddleware } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { RequestContext } from "../context/request-context";

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const existing = req.header("x-request-id");
    const requestId =
      existing && existing.trim().length > 0
        ? existing.trim()
        : `req_${randomBytes(6).toString("hex")}`;

    req.headers["x-request-id"] = requestId;
    res.setHeader("X-Request-Id", requestId);

    const ipAddress =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      req.ip;

    const userAgent = req.headers["user-agent"] ?? "";

    RequestContext.run(
      {
        requestId,
        ipAddress: typeof ipAddress === "string" ? ipAddress : undefined,
        userAgent: typeof userAgent === "string" ? userAgent : undefined,
        route: req.baseUrl || req.path,
        method: req.method,
        startTime: Date.now(),
      },
      () => {
        next();
      },
    );
  }
}
