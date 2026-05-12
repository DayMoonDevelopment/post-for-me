import { useLoaderData } from "react-router";

import type { Route } from "../+types/route";

export const IntentOfUseNotice = () => {
  const { comparison } = useLoaderData<Route.ComponentProps["loaderData"]>();

  return (
    <div className="bg-muted/20 border-t border-muted/40">
      <div className="max-w-(--breakpoint-xl) w-full py-8 px-4 mx-auto">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="font-medium">DISCLAIMER - NOTICE OF INTENDED USE:</strong>{` This website and its content are provided by Post for Me for informational and comparative purposes to educate potential customers about available technologies and services in the social media API market. Any references to third-party trademarks, trade names, or brands, including those of ${comparison.competitor.name} and others, are used solely to identify the respective companies and their services for purposes of factual comparison, commentary, or analysis, consistent with applicable laws, including nominative fair use principles under the Lanham Act (15 U.S.C. §§ 1114, 1125). Post for Me does not claim ownership of any third-party trademarks or intend to imply endorsement, affiliation, or sponsorship by any referenced entities. All trademarks and trade names remain the property of their respective owners. Statements regarding market trends, customer preferences, or competitive services are based on Post for Me's good-faith understanding of publicly available information at the time of publication and are not intended to mislead or disparage any third party. This content is provided to promote transparency and informed decision-making in the public interest. Post for Me is committed to addressing any concerns regarding the accuracy or appropriateness of this content. Questions or objections may be directed to our designated agent at postforme@daymoon.dev for prompt review and resolution. Post for Me reserves all rights to modify or remove content as deemed necessary to comply with applicable laws or address legitimate concerns, without prejudice to its legal rights or defenses.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
