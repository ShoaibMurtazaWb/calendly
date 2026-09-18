import { Injectable } from "@nestjs/common";
import type { RegisterBody } from "@sched/api-contract";
import type { User } from "@prisma/client";
import { PrismaService } from "../shared/prisma/prisma.service";
import { rethrowUnique } from "../shared/prisma/unique";

@Injectable()
export class IdentityService {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(input: RegisterBody, passwordHash: string): Promise<User> {
    try {
      return await this.prisma.user.create({
        data: {
          email: input.email,
          passwordHash,
          name: input.name,
          username: input.username,
          timezone: input.timezone,
        },
      });
    } catch (error) {
      rethrowUnique(error, () => {
        throw error;
      });
    }
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }
}
