import { getConceptHomeData } from "@/components/homepage-concepts/data";
import { SunlitFieldGuide } from "@/components/homepage-concepts/sunlit-field-guide";

// Homepage reads Postgres; render on request so build/demo deploys survive DB outages.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await getConceptHomeData();

  return <SunlitFieldGuide data={data} withChrome={false} />;
}
