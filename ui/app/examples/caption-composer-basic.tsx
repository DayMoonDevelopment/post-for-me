import {
  CaptionComposer,
  CaptionComposerCount,
  CaptionComposerFooter,
  CaptionComposerHeader,
  CaptionComposerInput,
  CaptionComposerPlatforms,
  CaptionComposerTitle,
} from "~/components/caption-composer";

export function CaptionComposerBasic() {
  return (
    <CaptionComposer
      defaultValue="Big news @acme — our launch is finally here! #buildinpublic #startup"
      platforms={["x", "instagram", "bluesky", "linkedin"]}
      className="w-full max-w-xl"
    >
      <CaptionComposerHeader>
        <CaptionComposerTitle>What do you want to post?</CaptionComposerTitle>
      </CaptionComposerHeader>
      <CaptionComposerInput placeholder="Write a caption…" />
      <CaptionComposerFooter>
        <CaptionComposerCount />
        <CaptionComposerPlatforms />
      </CaptionComposerFooter>
    </CaptionComposer>
  );
}
