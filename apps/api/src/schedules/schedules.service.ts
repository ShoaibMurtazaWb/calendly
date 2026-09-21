import { Injectable } from "@nestjs/common";
import type { UpdateScheduleBody } from "@sched/api-contract";
import { PrismaService } from "../shared/prisma/prisma.service";
import { toScheduleResponse, type FullSchedule } from "./schedules.types";

@Injectable()
export class SchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  async getDefaultSchedule(userId: string) {
    let schedule = await this.prisma.schedule.findFirst({
      where: { userId, isDefault: true },
      include: {
        days: { orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] },
        overrides: { orderBy: { date: "asc" } },
      },
    });

    if (!schedule) {
      schedule = await this.createInitialDefaultSchedule(userId);
    }

    return toScheduleResponse(schedule as FullSchedule);
  }

  async updateDefaultSchedule(userId: string, input: UpdateScheduleBody) {
    let schedule = await this.prisma.schedule.findFirst({
      where: { userId, isDefault: true },
    });

    if (!schedule) {
      schedule = await this.createInitialDefaultSchedule(userId);
    }

    const scheduleId = schedule.id;

    await this.prisma.$transaction(async (tx) => {
      if (input.name !== undefined || input.timeZone !== undefined) {
        await tx.schedule.update({
          where: { id: scheduleId },
          data: {
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.timeZone !== undefined ? { timeZone: input.timeZone } : {}),
          },
        });
      }

      if (input.days !== undefined) {
        await tx.scheduleDay.deleteMany({
          where: { scheduleId },
        });

        if (input.days.length > 0) {
          await tx.scheduleDay.createMany({
            data: input.days.map((d) => ({
              scheduleId,
              dayOfWeek: d.dayOfWeek,
              startTime: d.startTime,
              endTime: d.endTime,
            })),
          });
        }
      }

      if (input.overrides !== undefined) {
        await tx.scheduleOverride.deleteMany({
          where: { scheduleId },
        });

        if (input.overrides.length > 0) {
          await tx.scheduleOverride.createMany({
            data: input.overrides.map((o) => ({
              scheduleId,
              date: o.date,
              isUnavailable: o.isUnavailable,
              startTime: o.startTime ?? null,
              endTime: o.endTime ?? null,
            })),
          });
        }
      }
    });

    const updated = await this.prisma.schedule.findUniqueOrThrow({
      where: { id: scheduleId },
      include: {
        days: { orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] },
        overrides: { orderBy: { date: "asc" } },
      },
    });

    return toScheduleResponse(updated as FullSchedule);
  }

  private async createInitialDefaultSchedule(userId: string): Promise<FullSchedule> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });

    const timeZone = user?.timezone || "UTC";

    // Default Mon-Fri 09:00 - 17:00
    const defaultDays = [1, 2, 3, 4, 5].map((dayOfWeek) => ({
      dayOfWeek,
      startTime: "09:00",
      endTime: "17:00",
    }));

    return this.prisma.schedule.create({
      data: {
        userId,
        name: "Working Hours",
        timeZone,
        isDefault: true,
        days: {
          create: defaultDays,
        },
      },
      include: {
        days: { orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] },
        overrides: { orderBy: { date: "asc" } },
      },
    }) as Promise<FullSchedule>;
  }
}
