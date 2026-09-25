import { Global, Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { BookingTokenService } from "./services/booking-token.service";
import { CryptoVaultService } from "./services/crypto-vault.service";
import { StructuredLoggerService } from "./services/structured-logger.service";

@Global()
@Module({
  imports: [PrismaModule],
  providers: [BookingTokenService, CryptoVaultService, StructuredLoggerService],
  exports: [PrismaModule, BookingTokenService, CryptoVaultService, StructuredLoggerService],
})
export class SharedModule {}

