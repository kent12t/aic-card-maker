import { CardWall } from "@/components/display/CardWall";

type DisplayPageProps = { searchParams: Promise<{ location?: string | string[] }> };

export default async function DisplayPage({ searchParams }: DisplayPageProps) {
  const { location } = await searchParams;
  return <CardWall location={typeof location === "string" ? location : undefined} />;
}
