import { SocialMediaLogoParticles } from "~/components/social-media-logo-particles";

import { cn } from "~/lib/utils";

import DotPattern from "~/ui/dot-pattern";

export const BackgroundPattern = () => {
  return (
    <>
      <DotPattern
        width={20}
        height={20}
        cx={1}
        cy={1}
        cr={1}
        className={cn(
          "mask-[radial-gradient(ellipse,rgba(0,0,0,0.3)_30%,black_50%)]",
          "dark:fill-slate-700",
        )}
      />
      <SocialMediaLogoParticles className="absolute inset-0" />
    </>
  );
};
