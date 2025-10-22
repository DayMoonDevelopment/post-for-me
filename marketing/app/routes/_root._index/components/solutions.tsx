import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/ui/accordion";
import {
  BookCheck,
  BotIcon,
  CalendarClockIcon,
  CalendarIcon,
  ChartPie,
  FolderSync,
  GamepadIcon,
  Goal,
  MonitorSmartphoneIcon,
  Users,
  WorkflowIcon,
  Zap,
} from "lucide-react";
import { useState } from "react";

const features = [
  {
    icon: CalendarClockIcon,
    title: "Social Media Scheduling",
    description:
      "Lower the overhead and maintenance of your unique social media scheduling tool so you can focus on the parts that make your app truly unique.",
  },
  {
    icon: BotIcon,
    title: "AI Content Generation",
    description:
      "Share your generated images and videos directly from your content generation flows and apps.",
  },
  {
    icon: WorkflowIcon,
    title: "Marketing Teams",
    description:
      "Customize your internal tools to best fit your team’s unique automation workflows.",
  },
  {
    icon: GamepadIcon,
    title: "Games",
    description:
      "Turn player success into sharable moments and expand your organic reach. Post wins and highlights to your player’s feeds and get more eyes on your game.",
  },
  {
    icon: MonitorSmartphoneIcon,
    title: "SaaS products",
    description:
      "Build new social media posting experiences for your customers in a fraction of the time.",
  },
];

export const Solutions = () => {
  const [selected, setSelected] = useState("item-0");

  return (
    <div className="min-h-screen flex items-center justify-center">
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
              {features.map(({ title, description, icon: Icon }, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="group/accordion-item data-[state=open]:border-b-2 data-[state=open]:border-primary"
                >
                  <AccordionTrigger className="text-lg [&>svg]:hidden group-first/accordion-item:pt-0">
                    <div className="flex items-center gap-4">
                      <Icon />
                      {title}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-[17px] leading-relaxed text-muted-foreground">
                    {description}
                    <div className="mt-6 mb-2 md:hidden aspect-video w-full bg-muted rounded-xl" />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* Media */}
          <div className="hidden md:block w-full h-full bg-muted rounded-xl">
            {selected}
          </div>
        </div>
      </div>
    </div>
  );
};
