import { PipeTransform } from "@nestjs/common";
import type { ZodType } from "zod";
import { ValidationError } from "../errors/app-error";
import { flattenZod } from "../filters/http-error.filter";

export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown): unknown {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new ValidationError({ fields: flattenZod(result.error) });
    }
    return result.data;
  }
}

export function zodPipe(schema: ZodType): ZodValidationPipe {
  return new ZodValidationPipe(schema);
}
