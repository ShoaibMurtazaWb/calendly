import { EventTypeForm } from "@/components/event-type-form";

export default async function EditEventTypePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EventTypeForm eventTypeId={id} />;
}
