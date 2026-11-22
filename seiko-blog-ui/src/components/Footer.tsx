import Image from "next/image";

export default function Footer({ textClass }: { textClass: string }) {
  return (
    <footer>
      <div className="pointer-events-none">
        <Image
          src="/animals.webp"
          alt=""
          width={1948}
          height={236}
          className="mx-auto h-auto w-full max-w-4xl"
          unoptimized
        />
      </div>

      <div className="mx-auto max-w-4xl px-4 pt-2 pb-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <p className={`text-base ${textClass}`}>
            云想衣裳花想容，春风拂槛露华浓。若非群玉山头见，会向瑶台月下逢。
          </p>
          <div
            className={`flex flex-wrap items-center justify-center gap-4 text-xs ${textClass}`}
          >
            <a
              href="https://beian.mps.gov.cn/#/query/webSearch?code=13010402003178"
              rel="noreferrer"
              target="_blank"
              className="flex items-center gap-1 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              <Image
                src="/gongan.png"
                alt="公安备案"
                width={16}
                height={16}
                className="h-4 w-4"
              />
              冀公网安备13010402003178号
            </a>
            <a
              href="https://beian.miit.gov.cn"
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              冀ICP备2025113221号-1
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
