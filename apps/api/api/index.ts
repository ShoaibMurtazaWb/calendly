import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import express, { type Request, type Response } from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { AppModule } from "../src/app.module";
import { JSON_BODY_LIMIT } from "../src/shared/constants";
import { HttpErrorFilter } from "../src/shared/filters/http-error.filter";
import { RequestIdInterceptor } from "../src/shared/interceptors/request-id.interceptor";
import { StructuredLoggerService } from "../src/shared/services/structured-logger.service";

const server = express();
let isReady = false;
let initPromise: Promise<void> | null = null;

async function bootstrapServerless(expressInstance: express.Express) {
  const logger = new StructuredLoggerService();
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressInstance),
    { rawBody: false, logger }
  );

  expressInstance.set("trust proxy", 1);
  app.use(helmet());
  app.use(cookieParser());
  app.use(express.json({ limit: JSON_BODY_LIMIT }));
  app.useGlobalFilters(new HttpErrorFilter());
  app.useGlobalInterceptors(new RequestIdInterceptor());

  app.enableCors({
    origin: (origin, callback) => {
      // Allow all origins or match WEB_ORIGIN / Vercel preview URLs
      callback(null, true);
    },
    credentials: true,
  });

  await app.init();
}

export default async function handler(req: Request, res: Response) {
  if (!isReady) {
    if (!initPromise) {
      initPromise = bootstrapServerless(server).then(() => {
        isReady = true;
      });
    }
    await initPromise;
  }
  server(req, res);
}
