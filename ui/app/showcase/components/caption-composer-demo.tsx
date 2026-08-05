import {
  CaptionComposer,
  CaptionComposerCount,
  CaptionComposerFooter,
  CaptionComposerHeader,
  CaptionComposerInput,
  CaptionComposerPlatforms,
  CaptionComposerTitle,
} from "~/components/caption-composer";
import { CaptionComposerBasic } from "~/examples/caption-composer-basic";

export function CaptionComposerPreview() {
  return <CaptionComposerBasic />;
}

export function CaptionComposerWithHeader() {
  return (
    <CaptionComposer
      defaultValue="Behind the scenes of today's shoot 📸 @acme #bts"
      platforms={["instagram", "threads", "x"]}
      className="w-full max-w-xl"
    >
      <CaptionComposerHeader>
        <CaptionComposerTitle>Caption</CaptionComposerTitle>
        <CaptionComposerCount />
      </CaptionComposerHeader>
      <CaptionComposerInput placeholder="Write a caption…" />
      <CaptionComposerFooter>
        <CaptionComposerPlatforms />
      </CaptionComposerFooter>
    </CaptionComposer>
  );
}

const LONG_CAPTION =
  "We just shipped the biggest update in our history and I could not be more proud of this team. Months of late nights, countless iterations, and a relentless focus on the details all came together today. Thank you to everyone who tested, gave feedback, and believed in what we were building. @acme #launch #shipit";

export function CaptionComposerOverLimit() {
  return (
    <CaptionComposer
      defaultValue={LONG_CAPTION}
      platforms={["x", "bluesky", "instagram"]}
      className="w-full max-w-xl"
    >
      <CaptionComposerInput />
      <CaptionComposerFooter>
        <CaptionComposerCount platform="x" />
        <CaptionComposerPlatforms />
      </CaptionComposerFooter>
    </CaptionComposer>
  );
}

export { CaptionComposerBasic };
