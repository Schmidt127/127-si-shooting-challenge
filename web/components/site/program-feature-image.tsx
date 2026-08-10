import Image from "next/image";

import { withBasePath } from "@/lib/app-config";

type ProgramFeatureImageProps = {
  src: string;
  alt: string;
  caption: string;
};

export function ProgramFeatureImage({ src, alt, caption }: ProgramFeatureImageProps) {
  return (
    <figure className="mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <Image
        src={withBasePath(src)}
        alt={alt}
        width={1672}
        height={941}
        priority
        sizes="(max-width: 640px) calc(100vw - 2rem), (max-width: 1024px) calc(100vw - 4rem), 1024px"
        className="h-auto w-full"
      />
      <figcaption className="border-t border-border-subtle px-4 py-3 text-center text-xs text-muted sm:px-6">
        {caption}
      </figcaption>
    </figure>
  );
}
