import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard-shell";

export const metadata: Metadata = {
  title: "Dashboard | Sched",
  description: "Manage your meeting schedules, event types, and analytics.",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
