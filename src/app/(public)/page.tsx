import { getConceptHomeData } from "@/components/homepage-concepts/data";
import { SunlitFieldGuide } from "@/components/homepage-concepts/sunlit-field-guide";

export default async function HomePage() {
  const data = await getConceptHomeData();

  return <SunlitFieldGuide data={data} withChrome={false} />;
}
