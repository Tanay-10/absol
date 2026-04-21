import { ImpactScreen } from "@/components/ImpactScreen";

export default async function ImpactPage(props: PageProps<"/impact">) {
  const searchParams = await props.searchParams;
  const rawEventId = searchParams.eventId;
  const initialEventId = Array.isArray(rawEventId) ? rawEventId[0] : rawEventId;

  return <ImpactScreen initialEventId={initialEventId ?? null} />;
}
