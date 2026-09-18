import { Injectable } from "@nestjs/common";
import * as argon2 from "argon2";

@Injectable()
export class PasswordService {
  hash(plain: string): Promise<string> {
    return argon2.hash(plain, {
      type: argon2.argon2id,
      memoryCost: Number(process.env.ARGON2_MEMORY_COST ?? 19456),
      timeCost: Number(process.env.ARGON2_TIME_COST ?? 2),
    });
  }

  verify(hash: string, plain: string): Promise<boolean> {
    return argon2.verify(hash, plain);
  }
}
