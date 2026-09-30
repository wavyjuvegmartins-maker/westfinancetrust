import Image from "next/image";
import { ImageReveal, RevealGroup, RevealItem } from "@/components/motion";
import { cn } from "@/lib/utils";

type Img = { src: string; alt: string; width: number; height: number };

/** Opening block for inner pages: title, lede, actions and an optional image. */
export function PageHeader({
  title,
  lede,
  image,
  imageClassName,
  badge,
  children,
}: {
  title: React.ReactNode;
  lede: React.ReactNode;
  image?: Img;
  imageClassName?: string;
  badge?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="border-b border-line bg-paper">
      <div
        className={cn(
          "container-page grid items-center gap-12 py-16 sm:py-20",
          image && "lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:py-24",
        )}
      >
        <RevealGroup className="max-w-2xl" stagger={0.1}>
          {badge && <RevealItem className="mb-6">{badge}</RevealItem>}
          <RevealItem>
            <h1 className="text-[clamp(2.5rem,5.5vw,4rem)] leading-[1.02] font-semibold tracking-[-0.035em]">
              {title}
            </h1>
          </RevealItem>
          <RevealItem>
            <p className="mt-6 text-lg leading-relaxed text-slate sm:text-xl">{lede}</p>
          </RevealItem>
          {children && <RevealItem className="mt-9 flex flex-wrap gap-3">{children}</RevealItem>}
        </RevealGroup>
        {image && (
          <ImageReveal className="overflow-hidden rounded-3xl" delay={0.15}>
            <Image
              src={image.src}
              alt={image.alt}
              width={image.width}
              height={image.height}
              priority
              sizes="(min-width: 1024px) 480px, 100vw"
              className={cn("aspect-[4/3] w-full object-cover lg:aspect-[5/4]", imageClassName)}
            />
          </ImageReveal>
        )}
      </div>
    </section>
  );
}
