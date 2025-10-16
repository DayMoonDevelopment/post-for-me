import { Separator } from "~/ui/separator";
import { Link } from "react-router";
import { Logo } from "~/components/logo";

const footerSections = [
  {
    title: "Product",
    links: [
      {
        title: "Overview",
        href: "/about",
      },
      {
        title: "Pricing",
        href: "/pricing",
      },
      {
        title: "Frequently Asked Questions",
        href: "/faq",
      },
    ],
  },
  {
    title: "Resources",
    links: [
      {
        title: "TikTok API",
        href: "/resources/getting-started-with-the-tiktok-api",
      },
      {
        title: "Facebook API",
        href: "/resources/getting-started-with-the-facebook-api",
      },
      {
        title: "Instagram API",
        href: "/resources/getting-started-with-the-instagram-api",
      },
      {
        title: "YouTube API",
        href: "/resources/getting-started-with-the-youtub-api",
      },
      {
        title: "LinkedIn API",
        href: "/resources/getting-started-with-the-linkedin-api",
      },
      {
        title: "X (Twitter) API",
        href: "/resources/getting-started-with-the-x-api",
      },
      {
        title: "Bluesky API",
        href: "/resources/getting-started-with-the-bluesky-api",
      },
      {
        title: "Pinterest API",
        href: "/resources/getting-started-with-the-pinterest-api",
      },
      {
        title: "Threads API",
        href: "/resources/getting-started-with-the-threads-api",
      },
    ],
  },
  {
    title: "Solutions",
    links: [
      {
        title: "Social Media Scheduler",
        href: "/solutions/social-media-scheduler",
      },
      {
        title: "AI Content Generation",
        href: "/solutions/ai-content-generation",
      },
      {
        title: "Marketing Teams",
        href: "/solutions/marketing-teams",
      },
      {
        title: "Games",
        href: "/solutions/games",
      },
      {
        title: "Saas Products",
        href: "/solutions/saas-products",
      },
    ],
  },
  {
    title: "Social",
    links: [
      {
        title: "X (Twitter)",
        href: "#",
      },
      {
        title: "GitHub",
        href: "#",
      },
      {
        title: "YouTube",
        href: "#",
      },
      {
        title: "LinkedIn",
        href: "#",
      },
    ],
  },
  {
    title: "Legal",
    links: [
      {
        title: "Terms",
        href: "#",
      },
      {
        title: "Privacy",
        href: "#",
      },
      {
        title: "Contact",
        href: "#",
      },
    ],
  },
];

export const Footer = () => {
  return (
    <footer className="border-t">
      <div className="max-w-(--breakpoint-2xl) mx-auto">
        <div className="py-12 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-8 gap-y-10 px-4 sm:px-6 lg:px-8">
          {footerSections.map(({ title, links }) => (
            <div key={title}>
              <h6 className="font-medium">{title}</h6>
              <ul className="mt-6 space-y-4">
                {links.map(({ title, href }) => (
                  <li key={title}>
                    <Link
                      to={href}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <Separator />
        <div className="py-8 flex flex-col sm:flex-row items-center justify-between gap-x-2 gap-y-4 px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Logo className="h-8" />

          {/* Copyright */}
          <span className="text-muted-foreground">
            &copy; {new Date().getFullYear()}{" "}
            <Link to="/" target="_blank">
              Day Moon Development
            </Link>
            . All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
};
