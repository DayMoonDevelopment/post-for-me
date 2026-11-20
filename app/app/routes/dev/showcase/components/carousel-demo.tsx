import { Card, CardContent } from "~/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "~/ui/carousel";

import { Section } from "./section";

export function CarouselDemo() {
  return (
    <div className="space-y-8">
      <Section title="With controls">
        <Carousel className="mx-12 w-full max-w-xs">
          <CarouselContent>
            {Array.from({ length: 5 }, (_, i) => (
              <CarouselItem key={i}>
                <Card>
                  <CardContent className="flex aspect-square items-center justify-center">
                    <span className="text-4xl font-semibold">{i + 1}</span>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </Section>
      <Section title="Multiple per view">
        <Carousel className="mx-12 w-full max-w-sm" opts={{ align: "start" }}>
          <CarouselContent>
            {Array.from({ length: 6 }, (_, i) => (
              <CarouselItem key={i} className="basis-1/3">
                <Card>
                  <CardContent className="flex aspect-square items-center justify-center">
                    <span className="text-xl font-semibold">{i + 1}</span>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </Section>
    </div>
  );
}
