import { Injectable } from "@nestjs/common";
import type { LoginBody, RegisterBody } from "@sched/api-contract";
import { UnauthorizedError } from "../shared/errors/app-error";
import { IdentityService } from "../identity/identity.service";
import { toCurrentUser, type CurrentUserResponse } from "../identity/identity.types";
import { PasswordService } from "./password.service";
import { SessionService } from "./session.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly identity: IdentityService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
  ) {}

  async register(input: RegisterBody): Promise<{ user: CurrentUserResponse; token: string }> {
    const passwordHash = await this.passwords.hash(input.password);
    const user = await this.identity.createUser(input, passwordHash);
    const { token } = await this.sessions.create(user.id);
    return { user: toCurrentUser(user), token };
  }

  async login(input: LoginBody): Promise<{ user: CurrentUserResponse; token: string }> {
    const user = await this.identity.findByEmail(input.email);
    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }
    const ok = await this.passwords.verify(user.passwordHash, input.password);
    if (!ok) {
      throw new UnauthorizedError("Invalid email or password");
    }
    const { token } = await this.sessions.create(user.id);
    return { user: toCurrentUser(user), token };
  }

  async me(userId: string): Promise<CurrentUserResponse> {
    const user = await this.identity.findById(userId);
    if (!user) {
      throw new UnauthorizedError();
    }
    return toCurrentUser(user);
  }

  logout(sessionId: string): Promise<void> {
    return this.sessions.revoke(sessionId);
  }
}
