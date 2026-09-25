import { AvailabilityEditor } from "@/components/availability-editor";

export const metadata = {
  title: "Availability - Sched",
  description: "Configure your weekly working hours and intervals.",
};

export default function AvailabilityPage() {
  return <AvailabilityEditor />;
}
