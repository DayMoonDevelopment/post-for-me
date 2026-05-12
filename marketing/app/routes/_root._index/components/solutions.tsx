import {
  IconRobot as IconRobotFilled,
  IconCalendarClock as IconCalendarClockFilled,
  IconGamepad as IconGamepadFilled,
  IconDevices as IconDevicesFilled,
  IconCelebrate as IconCelebrateFilled,
} from "@central-icons/filled";
import {
  IconRobot as IconRobotOutlined,
  IconCalendarClock as IconCalendarClockOutlined,
  IconGamepad as IconGamepadOutlined,
  IconDevices as IconDevicesOutlined,
  IconCelebrate as IconCelebrateOutlined,
} from "@central-icons/outlined";
import { useState } from "react";

import { cn } from "~/lib/utils";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/ui/accordion";

const features = [
  {
    id: "social-media-scheduler",
    iconOutlined: IconCalendarClockOutlined,
    iconFilled: IconCalendarClockFilled,
    title: "Social Media Schedulers",
    description:
      "Go to market faster with more integrations. Lower the overhead and maintenance of your social media scheduling tool so you can focus on the parts that make your app truly unique.",
    imgSrc: "/solutions/social-media-scheduler",
  },
  {
    id: "ai-content-generation",
    iconOutlined: IconRobotOutlined,
    iconFilled: IconRobotFilled,
    title: "AI Content Generation",
    description:
      "Generate text, images, and video, then post them to all social media platforms. Our MCP server and API makes it easy to add posting directly in the tools you're already using.",
    imgSrc: "/solutions/ai-content-generation",
  },
  {
    id: "marketing-teams",
    iconOutlined: IconCelebrateOutlined,
    iconFilled: IconCelebrateFilled,
    title: "Marketing Teams",
    description:
      "Scale your client base with specialized workflows and automation to let you serve more content for less cost. Tailor reporting to engagement metrics that are actually relevant.",
    imgSrc: "/solutions/marketing",
  },
  {
    id: "games",
    iconOutlined: IconGamepadOutlined,
    iconFilled: IconGamepadFilled,
    title: "Games",
    description:
      "Turn player success into sharable moments and expand your organic reach. Post wins and highlights to your player's feeds and get more eyes on your game.",
    imgSrc: "/solutions/games",
  },
  {
    id: "saas-products",
    iconOutlined: IconDevicesOutlined,
    iconFilled: IconDevicesFilled,
    title: "SaaS products",
    description:
      "Add social media experiences to your customers without disrupting your current roadmap. Give your users unique insights into their social media accounts or launch them into a new level of social media growth.",
    imgSrc: "/solutions/saas-products",
  },
];

export const Solutions = () => {
  const [selected, setSelected] = useState(features[0].id);
  const selectedFeature = features.find((feature) => feature.id === selected);

  return (
    <div
      id="solutions"
      className="min-h-screen flex items-center justify-center"
    >
      <div className="max-w-(--breakpoint-lg) w-full py-12 px-6">
        <h2 className="text-4xl md:text-5xl md:leading-14 font-semibold tracking-[-0.03em] max-w-lg">
          Flexible tools to fit your unique product
        </h2>
        <div className="mt-6 md:mt-10 w-full mx-auto grid md:grid-cols-2 gap-12">
          <div>
            <Accordion
              value={selected}
              onValueChange={setSelected}
              type="single"
              className="w-full"
            >
              {features.map(
                ({
                  id,
                  title,
                  description,
                  iconOutlined: IconOutlined,
                  iconFilled: IconFilled,
                }) => {
                  const isSelected = selected === id;
                  return (
                    <AccordionItem
                      key={id}
                      value={id}
                      className="group/accordion-item data-[state=open]:border-b-2 data-[state=open]:border-primary"
                    >
                      <AccordionTrigger className="text-lg [&>svg]:hidden group-first/accordion-item:pt-0">
                        <div className="flex items-center gap-4">
                          <div className="relative w-6 h-6">
                            <IconOutlined
                              className={cn(
                                "absolute inset-0 transition-opacity duration-300",
                                isSelected ? "opacity-0" : "opacity-100",
                              )}
                            />
                            <IconFilled
                              className={cn(
                                "absolute inset-0 transition-opacity duration-300",
                                isSelected ? "opacity-100" : "opacity-0",
                              )}
                            />
                          </div>
                          {title}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="text-[17px] leading-relaxed text-muted-foreground">
                        {description}
                        <FeatureImage
                          imgSrc={selectedFeature?.imgSrc}
                          className="my-2 md:hidden"
                        />
                      </AccordionContent>
                    </AccordionItem>
                  );
                },
              )}
            </Accordion>
          </div>

          {/* Media */}
          <FeatureImage
            imgSrc={selectedFeature?.imgSrc}
            className="hidden md:block"
          />
        </div>
      </div>
    </div>
  );
};

function FeatureImage({
  imgSrc,
  className,
}: {
  imgSrc: string | null | undefined;
  className?: string;
}) {
  if (!imgSrc) return null;

  return (
    <div className={cn("w-full aspect-square overflow-hidden", className)}>
      <img
        src={`${imgSrc}-light.png`}
        alt="Feature Image"
        className="w-full h-full object-cover dark:hidden"
      />

      <img
        src={`${imgSrc}-dark.png`}
        alt="Feature Image"
        className="w-full h-full object-cover hidden dark:block"
      />
    </div>
  );
}
