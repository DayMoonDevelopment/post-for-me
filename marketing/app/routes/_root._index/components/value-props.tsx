import { cva } from "class-variance-authority";
import {
  ChartPie,
  NewspaperIcon,
  SendIcon,
  TimerIcon,
  TrendingUpDownIcon,
} from "lucide-react";

const features = [
  {
    icon: TimerIcon,
    title: "Ship in hours, not weeks.",
    description:
      "Drop-in REST calls replace dozens of separate APIs. Our example code gets you live the same day.",
    expand: true,
  },
  {
    icon: TrendingUpDownIcon,
    title: "9 platforms. 1 tool.",
    description:
      "TikTok, Instagram, YouTube, and more. Manage integrations with every social media platform from place.",
    expand: true,
  },
  {
    icon: SendIcon,
    title: "Social Media Posts",
    description:
      "Create, schedule, and publish text, images, and videos across all social platforms with a single API call.",
    expand: false,
  },
  {
    icon: NewspaperIcon,
    title: "Social Media Feeds",
    description:
      "Fetch and display social media content in your app. View feeds from any connected account across every platform.",
    expand: false,
  },
  {
    icon: ChartPie,
    title: "Post Analytics",
    description:
      "Track views, likes, shares, and engagement. Get comprehensive analytics from all platforms in one place.",
    expand: false,
  },
];

const gridStyles = cva("flex flex-col border rounded-xl py-6 px-5 bg-card", {
  variants: {
    expand: {
      true: "lg:col-span-3",
      false: "lg:col-span-2",
    },
  },
  defaultVariants: {
    expand: false,
  },
});

export function ValueProps() {
  return (
    <div className="flex items-center justify-center py-14">
      <div>
        <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight text-center max-w-2xl text-balance mx-auto">
          Integrate your product into the biggest social media platforms
        </h2>
        <div className="mt-10 sm:mt-16 grid sm:grid-cols-2 lg:grid-cols-6 gap-6 max-w-(--breakpoint-lg) mx-auto px-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className={gridStyles({ expand: feature.expand })}
            >
              <div className="flex flex-row items-center gap-3 mb-4">
                <div className="h-10 w-10 flex items-center justify-center bg-muted rounded-full">
                  <feature.icon className="size-5" />
                </div>
                <span className="text-lg font-semibold">{feature.title}</span>
              </div>
              <p className="mt-1 text-foreground/80 text-[15px]">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
