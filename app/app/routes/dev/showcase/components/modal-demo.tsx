import {
  Modal,
  ModalAside,
  ModalBody,
  ModalCarousel,
  ModalCarouselDots,
  ModalCarouselNav,
  ModalCarouselViewport,
  ModalClose,
  ModalColumn,
  ModalColumns,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalSlide,
  ModalTitle,
  ModalTrigger,
  ModalView,
  ModalViews,
  ModalViewsBack,
  useModalViews,
} from "~/components/modal";
import { Button } from "~/ui/button";

import { Section } from "./section";

const PARAGRAPHS = Array.from(
  { length: 8 },
  (_, i) =>
    `Paragraph ${i + 1}. The body is the single scroll region between the pinned header and footer — long content scrolls here while the chrome stays put.`,
);

export function ModalDemo() {
  return (
    <div className="space-y-8">
      <Section title="Header · scrolling body · footer">
        <Modal>
          <ModalTrigger render={<Button variant="outline">Open</Button>} />
          <ModalContent layout="framed">
            <ModalHeader>
              <ModalTitle>Framed dialog</ModalTitle>
              <ModalDescription>
                Header and footer pin; the body owns the only scroll.
              </ModalDescription>
            </ModalHeader>
            <ModalBody className="flex flex-col gap-3">
              {PARAGRAPHS.map((p) => (
                <p key={p} className="text-sm text-muted-foreground">
                  {p}
                </p>
              ))}
            </ModalBody>
            <ModalFooter>
              <ModalClose render={<Button variant="ghost">Cancel</Button>} />
              <ModalClose render={<Button>Save</Button>} />
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Section>

      <Section title="Two columns (muted aside)">
        <Modal>
          <ModalTrigger render={<Button variant="outline">Open</Button>} />
          <ModalContent layout="framed" className="max-w-3xl">
            <ModalHeader>
              <ModalTitle>Choose an option</ModalTitle>
            </ModalHeader>
            <ModalColumns>
              <ModalColumn className="flex flex-col gap-3">
                {Array.from({ length: 6 }, (_, i) => (
                  <p key={i} className="text-sm text-muted-foreground">
                    Primary column item {i + 1}. This column scrolls
                    independently of the aside.
                  </p>
                ))}
              </ModalColumn>
              <ModalAside className="flex flex-col gap-2">
                <p className="font-heading text-lg font-semibold text-foreground">
                  Summary
                </p>
                <p className="text-sm text-muted-foreground">
                  The trailing column is a distinguished muted panel — for a
                  value-prop, a preview, or a running summary.
                </p>
              </ModalAside>
            </ModalColumns>
            <ModalFooter>
              <ModalClose render={<Button>Continue</Button>} />
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Section>

      <Section title="Slidable carousel">
        <Modal>
          <ModalTrigger render={<Button variant="outline">Open</Button>} />
          <ModalContent layout="framed" className="max-w-xl">
            <ModalTitle className="sr-only">Slidable tour</ModalTitle>
            <ModalCarousel>
              <ModalCarouselViewport>
                {["Welcome", "How it works", "You're set"].map((heading, i) => (
                  <ModalSlide key={heading}>
                    <div className="flex h-72 flex-col justify-center gap-3 px-6">
                      <p className="font-heading text-xl font-semibold text-foreground">
                        {heading}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Slide {i + 1} of 3. Stepping is deliberate — drag is off,
                        the footer buttons advance.
                      </p>
                    </div>
                  </ModalSlide>
                ))}
              </ModalCarouselViewport>
              <ModalFooter className="sm:justify-between">
                <ModalCarouselDots />
                <ModalCarouselNav />
              </ModalFooter>
            </ModalCarousel>
          </ModalContent>
        </Modal>
      </Section>

      <Section title="Replace-style inner navigation">
        <Modal>
          <ModalTrigger render={<Button variant="outline">Open</Button>} />
          <ModalContent layout="framed">
            <ModalViews defaultView="home">
              <ModalHeader className="flex-row items-center gap-2 text-start sm:flex-row">
                <ModalViewsBack />
                <ModalTitle>Settings</ModalTitle>
              </ModalHeader>
              <ModalBody>
                <ModalView value="home">
                  <ViewsHome />
                </ModalView>
                <ModalView value="profile">
                  <p className="text-sm text-muted-foreground">
                    Profile settings. The previous view is replaced in place;
                    Back pops the stack.
                  </p>
                </ModalView>
                <ModalView value="billing">
                  <p className="text-sm text-muted-foreground">
                    Billing settings. Each destination is its own view, mounted
                    only when active.
                  </p>
                </ModalView>
              </ModalBody>
            </ModalViews>
          </ModalContent>
        </Modal>
      </Section>

      <Section title="Carousel + nested views">
        <Modal>
          <ModalTrigger render={<Button variant="outline">Open</Button>} />
          <ModalContent layout="framed" className="max-w-xl">
            <ModalTitle className="sr-only">Combination</ModalTitle>
            <ModalCarousel>
              <ModalCarouselViewport>
                <ModalSlide>
                  <div className="flex h-72 flex-col justify-center gap-3 px-6">
                    <p className="font-heading text-xl font-semibold text-foreground">
                      A normal slide
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Advance to a slide that drills in place.
                    </p>
                  </div>
                </ModalSlide>
                <ModalSlide>
                  <ModalViews defaultView="root">
                    <div className="flex h-72 flex-col gap-3 px-6 py-4">
                      <div className="flex items-center gap-2">
                        <ModalViewsBack />
                        <p className="font-heading text-lg font-semibold text-foreground">
                          Nested stack
                        </p>
                      </div>
                      <ModalView value="root">
                        <NestedRoot />
                      </ModalView>
                      <ModalView value="leaf">
                        <p className="text-sm text-muted-foreground">
                          A view nested inside a carousel slide.
                        </p>
                      </ModalView>
                    </div>
                  </ModalViews>
                </ModalSlide>
              </ModalCarouselViewport>
              <ModalFooter className="sm:justify-between">
                <ModalCarouselDots />
                <ModalCarouselNav />
              </ModalFooter>
            </ModalCarousel>
          </ModalContent>
        </Modal>
      </Section>
    </div>
  );
}

function ViewsHome() {
  const { push } = useModalViews();
  return (
    <div className="flex flex-col gap-2">
      <Button variant="outline" onClick={() => push("profile")}>
        Profile
      </Button>
      <Button variant="outline" onClick={() => push("billing")}>
        Billing
      </Button>
    </div>
  );
}

function NestedRoot() {
  const { push } = useModalViews();
  return (
    <Button variant="outline" onClick={() => push("leaf")}>
      Drill in
    </Button>
  );
}
