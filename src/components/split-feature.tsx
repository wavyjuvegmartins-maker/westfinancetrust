import Image from "next/image";
import { ImageReveal } from "@/components/motion";
import { cn } from "@/lib/utils";

type Img = { src: string; alt: string; width: number; height: number };

/** Image beside text. `reverse` puts the image on the right on large screens. */
export function SplitFeature({
  image,
  reverse = false,
  imageClassName,
  children,
  className,
}: {
  image: Img;
  reverse?: boolean;
  imageClassName?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid items-center gap-10 lg:grid-cols-2 lg:gap-16", className)}>
      <ImageReveal className={cn("group overflow-hidden rounded-3xl", reverse && "lg:order-2")}>
        <Image
          src={image.src}
          alt={image.alt}
          width={image.width}
          height={image.height}
          sizes="(min-width: 1024px) 560px, 100vw"
          className={cn(
            "h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]",
            imageClassName,
          )}
        />
      </ImageReveal>
      <div>{children}</div>
    </div>
  );
}
