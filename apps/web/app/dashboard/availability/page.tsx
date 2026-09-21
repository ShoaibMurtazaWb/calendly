import { AvailabilityEditor } from "@/components/availability-editor";

export const metadata = {
  title: "Availability - Sched",
  description: "Configure your weekly working hours, intervals, and date overrides.",
};

export default function AvailabilityPage() {
  return <AvailabilityEditor />;
}
