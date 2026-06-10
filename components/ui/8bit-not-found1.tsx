import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/8bit-button";

interface NotFound1Props {
  className?: string;
  cta?: string;
  description?: string;
  href?: string;
  imageSrc?: string;
  title?: string;
}

export default function NotFound1({
  title = "You made the Ogre angry!",
  description = "This room doesn't exist. Turn back before it's too late.",
  cta = "Return to Home Page",
  href = "/",
  imageSrc = "https://images.unsplash.com/photo-1542779283-429940ce8336?q=80&w=256&auto=format&fit=crop", // Stock image since Unsplash was requested, but user also said pure CSS for the game. For this img, we'll use a generic one or the original ogre if preferred, but original ogre URL was 8bitcn.com which might be broken.
  className,
}: NotFound1Props) {
  return (
    <div
      className={cn(
        "grid w-full place-content-center gap-5 bg-background px-4 py-16 text-center md:py-24",
        className,
      )}
    >
      <div className="retro font-bold text-6xl tracking-tight sm:text-8xl">
        404
      </div>

      {imageSrc && (
        <div className="flex justify-center -mt-10">
          <img
            alt="404"
            className="pixelated w-[200px] h-[200px] object-cover rounded-md border-4 border-black shadow-[8px_8px_0_0_#000]"
            src={imageSrc}
          />
        </div>
      )}

      <h1 className="retro font-bold text-2xl tracking-tight sm:text-4xl mt-6">
        {title}
      </h1>

      <p className="retro text-muted-foreground text-xs leading-relaxed">{description}</p>

      <div className="flex justify-center mt-4">
        <a href={href}>
          <Button>{cta}</Button>
        </a>
      </div>
    </div>
  );
}
