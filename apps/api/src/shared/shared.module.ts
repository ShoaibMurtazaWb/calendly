import { Global, Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { BookingTokenService } from "./services/booking-token.service";
import { CryptoVaultService } from "./services/crypto-vault.service";

@Global()
@Module({
  imports: [PrismaModule],
  providers: [BookingTokenService, CryptoVaultService],
  exports: [PrismaModule, BookingTokenService, CryptoVaultService],
})
export class SharedModule {}
