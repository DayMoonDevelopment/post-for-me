import * as React from "react";

import { cn } from "~/lib/utils";
import { Button } from "~/ui/button";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "~/ui/carousel";

/**
 * The **slidable** variation of {@link ./modal Modal}: ordered horizontal slides
 * with a deliberate (button-driven) step, generalizing the launchpad tour /
 * onboarding carousels. Drag is off — stepping is via {@link ModalCarouselNav}.
 *
 * `ModalCarousel` is a PROVIDER that wraps the whole region, so the track
 * ({@link ModalCarouselViewport}, holding {@link ModalSlide}s) and a sibling
 * `ModalFooter` with {@link ModalCarouselDots} + {@link ModalCarouselNav} all read
 * the same carousel state:
 *
 * ```
 * <ModalContent layout="framed">
 *   <ModalCarousel>
 *     <ModalCarouselViewport>
 *       <ModalSlide>…</ModalSlide>
 *     </ModalCarouselViewport>
 *     <ModalFooter className="sm:justify-between">
 *       <ModalCarouselDots />
 *       <ModalCarouselNav onFinish={…} />
 *     </ModalFooter>
 *   </ModalCarousel>
 * </ModalContent>
 * ```
 *
 * Orthogonal to {@link ./modal-views ModalViews}: a slide may host a nested
 * `ModalViews` for drill-down within a step.
 */
type ModalCarouselContextValue = {
  index: number;
  isFirst: boolean;
  isLast: boolean;
  scrollNext: () => void;
  scrollPrev: () => void;
  setApi: (api: CarouselApi) => void;
  total: number;
};

const ModalCarouselContext =
  React.createContext<ModalCarouselContextValue | null>(null);

function useModalCarousel() {
  const ctx = React.useContext(ModalCarouselContext);
  if (!ctx) {
    throw new Error("useModalCarousel must be used within <ModalCarousel>");
  }
  return ctx;
}

function ModalCarousel({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const [api, setApi] = React.useState<CarouselApi>();
  const [index, setIndex] = React.useState(0);
  const [total, setTotal] = React.useState(0);

  React.useEffect(() => {
    if (!api) return;
    const update = () => {
      setIndex(api.selectedScrollSnap());
      setTotal(api.scrollSnapList().length);
    };
    update();
    api.on("select", update);
    api.on("reInit", update);
    return () => {
      api.off("select", update);
      api.off("reInit", update);
    };
  }, [api]);

  const scrollNext = React.useCallback(() => api?.scrollNext(), [api]);
  const scrollPrev = React.useCallback(() => api?.scrollPrev(), [api]);

  return (
    <ModalCarouselContext.Provider
      value={{
        index,
        total,
        isFirst: index === 0,
        isLast: total === 0 || index === total - 1,
        setApi,
        scrollNext,
        scrollPrev,
      }}
    >
      <div
        data-slot="modal-carousel"
        // The provider wraps the WHOLE region (track + footer) so a sibling
        // footer's dots/nav can read the carousel state.
        className={cn("flex min-h-0 flex-1 flex-col", className)}
        {...props}
      >
        {children}
      </div>
    </ModalCarouselContext.Provider>
  );
}

/** The embla track. Lives inside {@link ModalCarousel}; holds {@link ModalSlide}s. */
function ModalCarouselViewport({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const { setApi } = useModalCarousel();
  return (
    <Carousel
      data-slot="modal-carousel-viewport"
      setApi={setApi}
      // Drag off: stepping is deliberate (footer buttons only).
      opts={{ align: "start", watchDrag: false }}
      className={cn("w-full", className)}
      {...props}
    >
      <CarouselContent className="ms-0">{children}</CarouselContent>
    </Carousel>
  );
}

function ModalSlide({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <CarouselItem
      data-slot="modal-slide"
      className={cn("ps-0", className)}
      {...props}
    />
  );
}

function ModalCarouselDots({ className }: { className?: string }) {
  const { index, total } = useModalCarousel();
  return (
    <div
      data-slot="modal-carousel-dots"
      className={cn("flex items-center gap-1", className)}
      aria-hidden
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 rounded-full bg-border transition-all",
            i === index ? "w-4 bg-primary" : "w-1.5",
          )}
        />
      ))}
    </div>
  );
}

function ModalCarouselNav({
  backLabel = "Back",
  nextLabel = "Next",
  finishLabel = "Finish",
  onFinish,
  disabled = false,
  className,
}: {
  backLabel?: string;
  className?: string;
  /** Blocks the advance/finish action — for a step whose `onFinish` performs a
   * real write, where a second click would submit twice. Back stays available
   * so the step is never a trap. */
  disabled?: boolean;
  finishLabel?: string;
  nextLabel?: string;
  onFinish?: () => void;
}) {
  const { isFirst, isLast, scrollNext, scrollPrev } = useModalCarousel();
  return (
    <div
      data-slot="modal-carousel-nav"
      className={cn("flex items-center gap-2", className)}
    >
      {!isFirst ? (
        <Button variant="ghost" onClick={scrollPrev}>
          {backLabel}
        </Button>
      ) : null}
      {isLast ? (
        <Button onClick={onFinish} disabled={disabled}>
          {finishLabel}
        </Button>
      ) : (
        <Button onClick={scrollNext} disabled={disabled}>
          {nextLabel}
        </Button>
      )}
    </div>
  );
}

export {
  ModalCarousel,
  ModalCarouselDots,
  ModalCarouselNav,
  ModalCarouselViewport,
  ModalSlide,
  useModalCarousel,
};
