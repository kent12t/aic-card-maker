import { CardWall } from "@/components/display/CardWall";
import Link from "next/link";

export default async function DisplayPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const eventMode = (await searchParams).event === "true";
  return <>
    <CardWall />
    {!eventMode && <Link href="/" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#ff661e] px-6 py-4 text-base font-bold text-white shadow-lg">Create your thank you card</Link>}
  </>;
}
