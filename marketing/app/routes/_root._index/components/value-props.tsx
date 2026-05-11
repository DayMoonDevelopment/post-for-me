import {
  IconPieChart1,
  IconNewspaper,
  IconSend,
  IconEmojiSmile,
  IconStopwatch,
  IconTrending1,
} from "@central-icons/outlined";

const features = [
  {
    icon: IconStopwatch,
    title: "Ship in hours, not weeks.",
    description:
      "Drop-in REST calls replace dozens of separate APIs. Our example code gets you live the same day.",
  },
  {
    icon: IconTrending1,
    title: "9 platforms. 1 tool.",
    description:
      "TikTok, Instagram, YouTube, and more. Manage integrations with every social media platform from place.",
  },
  {
    icon: IconEmojiSmile,
    title: "Your users. Your brand.",
    description:
      "Bring your own developer credentials from each platform so your users connect their social media accounts to YOUR app.",
  },
  {
    icon: IconSend,
    title: "Social Media Posts",
    description:
      "Create, schedule, and publish text, images, and videos across all social platforms with a single API call.",
  },
  {
    icon: IconNewspaper,
    title: "Social Media Feeds",
    description:
      "Fetch and display social media content in your app. View feeds from any connected account across every platform.",
  },
  {
    icon: IconPieChart1,
    title: "Post Analytics",
    description:
      "Track views, likes, shares, and engagement. Get comprehensive analytics from all platforms in one place.",
  },
];

export function ValueProps() {
  return (
    <div id="features" className="flex items-center justify-center py-14">
      <div>
        <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight text-center max-w-2xl text-balance mx-auto">
          Integrate your product into the biggest social media platforms
        </h2>
        <div className="mt-10 sm:mt-16 grid sm:grid-cols-2 lg:grid-cols-6 gap-6 max-w-(--breakpoint-lg) mx-auto px-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="lg:col-span-2 flex flex-col border rounded-xl py-6 px-5 bg-card"
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
