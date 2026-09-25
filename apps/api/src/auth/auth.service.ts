import { Injectable } from "@nestjs/common";
import type { LoginBody, RegisterBody } from "@sched/api-contract";
import { UnauthorizedError } from "../shared/errors/app-error";
import { IdentityService } from "../identity/identity.service";
import { toCurrentUser, type CurrentUserResponse } from "../identity/identity.types";
import { PasswordService } from "./password.service";
import { SessionService } from "./session.service";
import { AuditService } from "../audit/audit.service";
import { RequestContext } from "../shared/context/request-context";

@Injectable()
export class AuthService {
  constructor(
    private readonly identity: IdentityService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
    private readonly audit: AuditService,
  ) {}

  async register(input: RegisterBody): Promise<{ user: CurrentUserResponse; token: string }> {
    const passwordHash = await this.passwords.hash(input.password);
    const user = await this.identity.createUser(input, passwordHash);
    const { token } = await this.sessions.create(user.id);

    RequestContext.setUserId(user.id);
    await this.audit.log({
      userId: user.id,
      action: "AUTHENTICATION_REGISTER",
      entityType: "User",
      entityId: user.id,
      metadata: { email: user.email, username: user.username },
    });

    return { user: toCurrentUser(user), token };
  }

  async login(input: LoginBody): Promise<{ user: CurrentUserResponse; token: string }> {
    const user = await this.identity.findByEmail(input.email);
    if (!user) {
      await this.audit.log({
        action: "AUTHENTICATION_FAILED",
        entityType: "User",
        metadata: { email: input.email, reason: "USER_NOT_FOUND" },
      });
      throw new UnauthorizedError("Invalid email or password");
    }
    const ok = await this.passwords.verify(user.passwordHash, input.password);
    if (!ok) {
      await this.audit.log({
        userId: user.id,
        action: "AUTHENTICATION_FAILED",
        entityType: "User",
        entityId: user.id,
        metadata: { email: input.email, reason: "INVALID_PASSWORD" },
      });
      throw new UnauthorizedError("Invalid email or password");
    }
    const { token } = await this.sessions.create(user.id);

    RequestContext.setUserId(user.id);
    await this.audit.log({
      userId: user.id,
      action: "AUTHENTICATION_LOGIN",
      entityType: "User",
      entityId: user.id,
      metadata: { email: user.email },
    });

    return { user: toCurrentUser(user), token };
  }

  async me(userId: string): Promise<CurrentUserResponse> {
    const user = await this.identity.findById(userId);
    if (!user) {
      throw new UnauthorizedError();
    }
    return toCurrentUser(user);
  }

  async logout(sessionId: string): Promise<void> {
    await this.audit.log({
      action: "AUTHENTICATION_LOGOUT",
      entityType: "Session",
      entityId: sessionId,
    });
    return this.sessions.revoke(sessionId);
  }
}
