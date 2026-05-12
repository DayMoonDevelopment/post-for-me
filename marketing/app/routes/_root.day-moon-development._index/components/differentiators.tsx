import { IconCircleCheck } from "@central-icons/outlined";

const services = [
  {
    title: "Digital Audits & Consultations",
    description:
      "Expert analysis of your digital presence, from SEO audits to comprehensive website and mobile app assessments.",
  },
  {
    title: "Website & Mobile App Development",
    description:
      "Full-stack design and development for web and mobile platforms, built with modern technologies and best practices.",
  },
  {
    title: "Team Augmentation",
    description:
      "Temporary staff resources and expertise to support your existing team through critical projects and growth phases.",
  },
  {
    title: "Product Launch Assistance",
    description:
      "Help founders bring their product vision to life with practical engineering guidance and rapid implementation.",
  },
  {
    title: "Product Scaling & Expansion",
    description:
      "Strategic support for established teams looking to scale infrastructure, add features, or enter new markets.",
  },
  {
    title: "Holistic Expertise",
    description:
      "Years of combined experience across e-commerce, nonprofits, and diverse tech stacks to solve complex challenges.",
  },
];

export const Services = () => {
  return (
    <div className="w-full bg-muted py-10">
      <div className="max-w-(--breakpoint-xl) mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="grid gap-6 md:grid-cols-2">
            {services.map((service) => (
              <div key={service.title} className="flex gap-4">
                <div className="shrink-0 mt-1">
                  <IconCircleCheck className="size-6 text-pop" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{service.title}</h3>
                  <p className="mt-1 text-sm md:text-base text-muted-foreground">
                    {service.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
