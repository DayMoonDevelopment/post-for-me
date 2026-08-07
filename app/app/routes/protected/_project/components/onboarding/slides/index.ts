export { BillingSlide } from "./billing-slide";
export { PlatformsSlide } from "./platforms-slide";
export { ProjectNameSlide } from "./project-name-slide";
export { ProjectTypeSlide } from "./project-type-slide";
export { ReviewSlide } from "./review-slide";
export { SegmentSlide } from "./segment-slide";
export { VolumeSlide } from "./volume-slide";
// Each onboarding slide is its own standalone component. The flow (welcome →
// segment → platforms → volume → project name → project type → review →
// billing) is assembled in order inside <OnboardingContent>; add a step by
// creating a file here and dropping it into that list. The review step is the
// always-present hub that confirms config, edits platforms, and drills into
// white-label keys.
export { WelcomeSlide } from "./welcome-slide";
