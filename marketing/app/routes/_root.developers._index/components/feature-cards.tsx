import {
  IconBookmarkCheck,
  IconPieChart1,
  IconTarget,
  IconArrowUpRight,
} from "@central-icons/outlined";

import {
  FeatureGrid,
  Feature,
  FeatureTitle,
  FeatureDescription,
  FeatureContent,
  FeatureFooter,
  FeatureHeader,
  FeatureGridContent,
} from "~/components/feature-grid-layout";
import { Link } from "~/components/link";

import { Button } from "~/ui/button";

const features = [
  {
    icon: IconTarget,
    title: "REST API",
    description: "Simple, single point of entry for every platform.",
    details:
      "Our RESTful API provides a consistent interface for posting to all major social media platforms. No need to learn multiple APIs or manage different authentication flows.",
    link: "https://api.postforme.dev/docs#description/getting-started",
  },
  {
    icon: IconBookmarkCheck,
    title: "SDK's",
    description: "Drop-in libraries for rapid integration.",
    details:
      "Pre-built client libraries for popular programming languages. Get started in minutes with type-safe, well-documented SDKs that handle all the complexity for you.",
    link: "https://api.postforme.dev/docs#description/client-libraries",
  },
  {
    icon: IconPieChart1,
    title: "Webhooks",
    description: "Real-time account connections and post status.",
    details:
      "Subscribe to events and get notified instantly when accounts are connected, posts are published, or errors occur. Build reactive experiences with confidence.",
    link: "https://api.postforme.dev/docs#tag/webhooks",
  },
];

export const FeatureCards = () => {
  return (
    <FeatureGrid>
      <FeatureGridContent>
        {features.map(
          ({ title, description, details, icon: Icon, link }, index) => (
            <Feature key={index}>
              <FeatureHeader>
                <Icon />
                <FeatureTitle>{title}</FeatureTitle>
                <FeatureDescription>{description}</FeatureDescription>
              </FeatureHeader>

              <FeatureContent>{details}</FeatureContent>

              <FeatureFooter>
                <Button asChild size="sm" mode="link">
                  <Link to={link} target="_blank">
                    Learn More
                    <IconArrowUpRight />
                  </Link>
                </Button>
              </FeatureFooter>
            </Feature>
          ),
        )}
      </FeatureGridContent>
    </FeatureGrid>
  );
};
