"use client";

import { IntroContent } from "@/components/card-maker/IntroContent";

export function DesktopEditorPanel() {
  return (
    <section className="hidden w-full rounded-2xl bg-white p-6 shadow-[0_4px_16px_rgba(0,0,0,0.12)] lg:block lg:w-[480px]">
      <IntroContent titleClassName="font-open-sans text-[26px] font-bold leading-none text-[#ff661e]" textClassName="text-[14px] font-semibold leading-[1.3] text-black" />
    </section>
  );
}
