import { Injectable } from "@nestjs/common";
import * as argon2 from "argon2";

@Injectable()
export class PasswordService {
  hash(plain: string): Promise<string> {
    const memoryCost = Math.max(2048, Number(process.env.ARGON2_MEMORY_COST ?? 19456));
    const timeCost = Math.max(2, Number(process.env.ARGON2_TIME_COST ?? 2));
    return argon2.hash(plain, {
      type: argon2.argon2id,
      memoryCost,
      timeCost,
    });
  }

  verify(hash: string, plain: string): Promise<boolean> {
    return argon2.verify(hash, plain);
  }
}
