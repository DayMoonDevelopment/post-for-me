import { AlertDemo } from "./alert-demo";
import { AvatarDemo } from "./avatar-demo";
import { BadgeDemo } from "./badge-demo";
import { BrandMarkDemo } from "./brand-mark-demo";
import { ButtonDemo } from "./button-demo";
import { CardDemo } from "./card-demo";
import { CarouselDemo } from "./carousel-demo";
import { ChoiceboxDemo } from "./choicebox-demo";
import { CodeBlockDemo } from "./code-block-demo";
import { CodePanelDemo } from "./code-panel-demo";
import { ConnectAccountModalDemo } from "./connect-account-modal-demo";
import { ConnectionResultDemo } from "./connection-result-demo";
import { CopyableDemo } from "./copyable-demo";
import { DataGridDemo } from "./data-grid-demo";
import { DateTimeDemo } from "./date-time-demo";
import { DialogDemo } from "./dialog-demo";
import { FactDemo } from "./fact-demo";
import { FieldDemo } from "./field-demo";
import { HintDemo } from "./hint-demo";
import { IconsDemo } from "./icons-demo";
import { InputDemo } from "./input-demo";
import { InputGroupDemo } from "./input-group-demo";
import { InputOtpDemo } from "./input-otp-demo";
import { InputSecretDemo } from "./input-secret-demo";
import { JsonBlockDemo } from "./json-block-demo";
import { LabelDemo } from "./label-demo";
import { ModalDemo } from "./modal-demo";
import { OnboardingDemo } from "./onboarding-demo";
import { OrbitingCirclesDemo } from "./orbiting-circles-demo";
import { PlatformAvatarDemo } from "./platform-avatar-demo";
import { ProjectTypeBadgeDemo } from "./project-type-badge-demo";
import { RadioGroupDemo } from "./radio-group-demo";
import { ReceiptDemo } from "./receipt-demo";
import { SeparatorDemo } from "./separator-demo";
import { SonnerDemo } from "./sonner-demo";
import { StatusDemo } from "./status-demo";
import { StatusIndicatorDemo } from "./status-indicator-demo";
import { StepsDemo } from "./steps-demo";
import { SwitchDemo } from "./switch-demo";
import { TabsDemo } from "./tabs-demo";
import { TextareaDemo } from "./textarea-demo";
import { UserAvatarDemo } from "./user-avatar-demo";
import { VerifyStatusDemo } from "./verify-status-demo";

export const demos: Record<
  string,
  { description: string; element: React.ReactNode; title: string; }
> = {
  alert: {
    title: "Alert",
    description: "ReUI alert callout — title, description, and semantic variants.",
    element: <AlertDemo />,
  },
  avatar: {
    title: "Avatar",
    description:
      "The low-level ui/Avatar primitive: image / initials / icon in a circle or rounded box. The UserAvatar / PlatformAvatar layer is built on this.",
    element: <AvatarDemo />,
  },
  "user-avatar": {
    title: "User Avatar",
    description:
      "A USER identity (person / account owner): circle, profile photo or dummy fill (variant=prominent for the sidebar user). One size scale (~/lib/avatar) drives the box + any accessories. Counterpart to Platform Avatar.",
    element: <UserAvatarDemo />,
  },
  "platform-avatar": {
    title: "Platform Avatar",
    description:
      "A PLATFORM identity (social network): rounded muted container + brand mark. Same size scale as User Avatar. Used standalone (project settings) or as a corner badge.",
    element: <PlatformAvatarDemo />,
  },
  badge: {
    title: "Badge",
    description: "ReUI badge with semantic state variants.",
    element: <BadgeDemo />,
  },
  button: {
    title: "Button",
    description: "Base UI button from the shadcn registry.",
    element: <ButtonDemo />,
  },
  card: {
    title: "Card",
    description: "Header, content, footer, and action anatomy.",
    element: <CardDemo />,
  },
  carousel: {
    title: "Carousel",
    description: "Embla-based carousel with controls and multi-item views.",
    element: <CarouselDemo />,
  },
  choicebox: {
    title: "Choicebox",
    description:
      "Card-styled selection group (toggle-group management + card anatomy). Single or multi-select.",
    element: <ChoiceboxDemo />,
  },
  "code-block": {
    title: "Code Block",
    description:
      "A read-only source-code sample: monospace scrolling <pre> with a language tag and whole-block copy. Plain text (no highlighting); `surface={false}` embeds it in a distinguished panel.",
    element: <CodeBlockDemo />,
  },
  "code-panel": {
    title: "Code Panel",
    description:
      "The reusable 'code for this action' viewer (language switcher + persistence + highlighting) and CodeShowcase, the UI+code split that works standalone or as a carousel/onboarding slide.",
    element: <CodePanelDemo />,
  },
  "connect-account-modal": {
    title: "Connect Account Modal",
    description:
      "The two-panel connect-a-social-account flow: setup form on the left (platform + options), a live createAuthURL code sample mirroring it in the muted aside. Skeleton — the primary action is still a placeholder (PFM-696).",
    element: <ConnectAccountModalDemo />,
  },
  "connection-result": {
    title: "Connection Result",
    description:
      "The public OAuth callback fallback (branded success / failure), shown when a project has no auth_callback_url. Flip between the connect outcomes it renders.",
    element: <ConnectionResultDemo />,
  },
  copyable: {
    title: "Copyable",
    description:
      "Composable copy-to-clipboard control — copies on click with a copied-confirmation swap and SR announce, and stops propagation so it's safe inside a clickable row.",
    element: <CopyableDemo />,
  },
  "data-grid": {
    title: "Data Grid",
    description:
      "ReUI TanStack-table data grid + Filters bar, vendored under app/components. Shown in manual/server mode: sortable columns, pagination, and filter chips.",
    element: <DataGridDemo />,
  },
  "date-time": {
    title: "Date Time",
    description:
      "Client-side, hydration-safe locale/timezone timestamp (date-fns). Renders in the viewer's own timezone after hydration; SSR + first paint agree on a deterministic value.",
    element: <DateTimeDemo />,
  },
  dialog: {
    title: "Dialog",
    description: "Centered modal dialog — the counterpart to the side Sheet.",
    element: <DialogDemo />,
  },
  fact: {
    title: "Fact",
    description:
      "A labelled label→value block (uppercase label over its value) for detail/summary surfaces. Lay several in a grid for a facts strip.",
    element: <FactDemo />,
  },
  field: {
    title: "Field",
    description: "Form layout primitives: sets, groups, labels, errors.",
    element: <FieldDemo />,
  },
  hint: {
    title: "Hint",
    description:
      "A lightbulb affordance in the dedicated `hint` (amber) colorspace — a tip/idea accent distinct from status colors. Skeleton for now.",
    element: <HintDemo />,
  },
  icons: {
    title: "Icons",
    description:
      "The semantic icon layer (app/icons) — intent-named bindings over Central Icons. Import these from ~/icons; never @central-icons directly in app code.",
    element: <IconsDemo />,
  },
  input: {
    title: "Input",
    description: "Text input types and states.",
    element: <InputDemo />,
  },
  "input-group": {
    title: "Input Group",
    description:
      "An input wrapped with leading/trailing addons (icons, text, buttons) — one focus-within ring around the whole group.",
    element: <InputGroupDemo />,
  },
  "input-otp": {
    title: "Input OTP",
    description: "One-time-code input with grouped slots.",
    element: <InputOtpDemo />,
  },
  "input-secret": {
    title: "Input Secret",
    description:
      "Masked secret input built on InputGroup — reveal toggle, and no OS password-manager suggestions (not a type=password field).",
    element: <InputSecretDemo />,
  },
  "json-block": {
    title: "JSON Block",
    description:
      "A small, read-only JSON viewer: token-highlighted, collapsible objects/arrays, whole-block copy via Copyable. JSON only, minimally interactive.",
    element: <JsonBlockDemo />,
  },
  label: {
    title: "Label",
    description: "Form labels paired with controls.",
    element: <LabelDemo />,
  },
  modal: {
    title: "Modal",
    description:
      "The composable modal-layout system over the Dialog primitive — header, scrolling body, two-column muted aside, slidable carousel, replace-style view stack, and footer, all combinable.",
    element: <ModalDemo />,
  },
  onboarding: {
    title: "Onboarding",
    description:
      "The user onboarding modal — a centered dialog wrapping a sliding carousel, starting with the segmentation question.",
    element: <OnboardingDemo />,
  },
  "orbiting-circles": {
    title: "Orbiting Circles",
    description: "Animated orbit rings, used with the brand icons.",
    element: <OrbitingCirclesDemo />,
  },
  "project-type-badge": {
    title: "Project Type Badge",
    description:
      "Branded Quickstart / White Label reference, colored via the data-brand theme axis.",
    element: <ProjectTypeBadgeDemo />,
  },
  "radio-group": {
    title: "Radio Group",
    description:
      "Single-select radio group; composes with the Field family as choice cards (2-col) or a stacked list.",
    element: <RadioGroupDemo />,
  },
  receipt: {
    title: "Receipt",
    description:
      "A paper-receipt display for line items and totals — perforated edges, dot leaders, a heavier total, and an optional decorative barcode.",
    element: <ReceiptDemo />,
  },
  separator: {
    title: "Separator",
    description: "Horizontal and vertical rules.",
    element: <SeparatorDemo />,
  },
  "brand-mark": {
    title: "Brand Mark",
    description:
      "The brand-mark primitive (ui/brand-mark): a provider id → brand mark binding. The single source of truth for platform glyphs, re-used by PlatformAvatar / platform-meta and the composer's per-platform readouts.",
    element: <BrandMarkDemo />,
  },
  sonner: {
    title: "Sonner",
    description:
      "Toasts for on-screen feedback — the surface for interaction errors (see useActionErrorToast).",
    element: <SonnerDemo />,
  },
  spinner: {
    title: "Spinner",
    description: "Central loading icon, plus the Status idle/busy/done machine.",
    element: <StatusDemo />,
  },
  "status-indicator": {
    title: "Status Indicator",
    description:
      "The status-dot primitive (ui/status-indicator) — a small round dot in a first-party semantic color (default/success/warning/destructive/info). Size + ring + position via className; reused by avatars, filters, lists.",
    element: <StatusIndicatorDemo />,
  },
  steps: {
    title: "Steps",
    description:
      "A vertical, status-driven step rail — ordered items threaded by a connector, each with a done / current / upcoming indicator. The launchpad checklist is the canonical consumer.",
    element: <StepsDemo />,
  },
  switch: {
    title: "Switch",
    description:
      "Binary on/off toggle (base-ui Switch). Controlled or uncontrolled, with disabled states.",
    element: <SwitchDemo />,
  },
  tabs: {
    title: "Tabs",
    description: "Base UI tabs from the shadcn registry.",
    element: <TabsDemo />,
  },
  textarea: {
    title: "Textarea",
    description: "Multi-line text input (pulled in with Input Group).",
    element: <TextareaDemo />,
  },
  "verify-status": {
    title: "Verify Status",
    description:
      "The OTP verifying → verified indicator (the real component), with live state controls.",
    element: <VerifyStatusDemo />,
  },
};

export const demoOrder = Object.keys(demos);
