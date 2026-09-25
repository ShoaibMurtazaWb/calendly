import { redirect } from "next/navigation";

export default function NewEventTypePage() {
  redirect("/dashboard?new=true");
}
