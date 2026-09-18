import { Body, Controller, Get, HttpCode, Post, Res, UseGuards } from "@nestjs/common";
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { loginBodySchema, registerBodySchema, type LoginBody, type RegisterBody } from "@sched/api-contract";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import type { Response } from "express";
import { zodPipe } from "../shared/pipes/zod-validation.pipe";
import { AuthService } from "./auth.service";
import { CurrentSessionId, CurrentUserId } from "./current-user.decorator";
import { SessionAuthGuard } from "./session-auth.guard";
import { SessionCookieService } from "./session-cookie.service";

@ApiTags("auth")
@Controller("api/v1/auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly cookies: SessionCookieService,
  ) {}

  @Post("register")
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: "Register and start a session" })
  async register(
    @Body(zodPipe(registerBodySchema)) body: RegisterBody,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { user, token } = await this.auth.register(body);
    this.cookies.set(response, token);
    return user;
  }

  @Post("login")
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: "Log in and start a session" })
  async login(
    @Body(zodPipe(loginBodySchema)) body: LoginBody,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { user, token } = await this.auth.login(body);
    this.cookies.set(response, token);
    return user;
  }

  @Post("logout")
  @HttpCode(204)
  @UseGuards(SessionAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: "Revoke the current session" })
  async logout(
    @CurrentSessionId() sessionId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.auth.logout(sessionId);
    this.cookies.clear(response);
  }

  @Get("me")
  @UseGuards(SessionAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: "Current authenticated user" })
  me(@CurrentUserId() userId: string) {
    return this.auth.me(userId);
  }
}
