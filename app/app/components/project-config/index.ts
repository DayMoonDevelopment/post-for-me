export { ProjectConfigContent } from "./project-config-content";
// The shared "Review your project" surface — reused by the onboarding review
// slide, the setup modal, and the settings page. The settings page's own
// composition (view, sections, danger zone) is route-local, not here.
export {
  ProjectKeyFields,
  ProjectPlatformPicker,
  ProjectReviewHub,
  ProjectReviewIdentity,
} from "./project-review";
export { ProjectSetupModal } from "./project-setup-modal";

// `credentialHasKeys` now lives with the brand-readiness rules in lib; it stays
// exported here so the existing `~/components/project-config` importers keep
// their one import site.
export { credentialHasKeys } from "~/lib/brand-readiness";
