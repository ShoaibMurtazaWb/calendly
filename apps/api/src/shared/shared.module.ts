import { Global, Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { BookingTokenService } from "./services/booking-token.service";

@Global()
@Module({
  imports: [PrismaModule],
  providers: [BookingTokenService],
  exports: [PrismaModule, BookingTokenService],
})
export class SharedModule {}
