import { solutions } from "./solutions";

export type SolutionPreview = {
  title: string;
  href: string;
  description: string;
};

export function getSolutionPreviews(): SolutionPreview[] {
  return Object.values(solutions).map((solution) => ({
    title: solution.nav.title,
    href: `/solutions/${solution.id}`,
    description: solution.nav.description,
  }));
}

export { solutions };
