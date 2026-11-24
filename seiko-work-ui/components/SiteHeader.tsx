import Image from "next/image";

export function SiteHeader() {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-10 flex items-center px-8 py-6">
      <h1 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight text-neutral-900 select-none dark:text-neutral-50">
        <Image src="/seiko-mobius.svg" alt="" width={40} height={40} loading="eager" className="shrink-0" />
        <span>Seiko<span className="font-light"> Work</span></span>
      </h1>
    </header>
  );
}
