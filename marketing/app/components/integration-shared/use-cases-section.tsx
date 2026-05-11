import { IconTarget, IconRocket, IconAgent } from "@central-icons/filled";

const iconMap = {
  0: IconTarget,
  1: IconAgent,
  2: IconRocket,
};

interface UseCasesSectionProps {
  platformName: string;
  useCases: Array<{ title: string; description: string }>;
}

export const UseCasesSection = ({
  platformName,
  useCases,
}: UseCasesSectionProps) => {
  if (useCases.length === 0) return null;

  return (
    <div className="bg-muted flex items-center justify-center py-14">
      <div className="max-w-(--breakpoint-xl) w-full px-6">
        <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight text-center max-w-2xl text-balance mx-auto mb-10 sm:mb-16">
          {`What you can build with ${platformName}`}
        </h2>

        <div className="grid sm:grid-cols-3 gap-6">
          {useCases.map(({ title, description }, index) => {
            const Icon = iconMap[index as keyof typeof iconMap];
            return (
              <div
                key={index}
                className="flex flex-col border rounded-xl py-6 px-5 bg-card"
              >
                <div className="h-10 w-10 flex items-center justify-center bg-muted rounded-full mb-4">
                  {Icon ? <Icon className="size-5 text-pop" /> : null}
                </div>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-1 text-foreground/80 text-[15px]">
                  {description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
