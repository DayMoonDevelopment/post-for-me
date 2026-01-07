import { AlertCircleIcon } from "lucide-react";
import { CircleInfoIcon } from "icons";
import { useFormContext } from "react-hook-form";
import { cn } from "~/lib/utils";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormGroup,
} from "~/ui/form";
import { Switch } from "~/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/ui/tooltip";
import { Input } from "~/ui/input";
import { Label } from "~/ui/label";
import { ToggleGroup, ToggleGroupItem } from "~/ui/toggle-group";
import { Alert, AlertDescription, AlertTitle } from "~/ui/alert";
import { Link } from "react-router";

export function TabTikTok() {
  const form = useFormContext();
  const discloseContent = form.watch("_disclose_content");
  const discloseYourBrand = form.watch(
    "platform_configurations.tiktok.disclose_your_brand",
  );
  const discloseBrandedContent = form.watch(
    "platform_configurations.tiktok.disclose_branded_content",
  );
  const privacyStatus = form.watch(
    "platform_configurations.tiktok.privacy_status",
  );

  const missingDisclosure =
    discloseContent && !(discloseYourBrand || discloseBrandedContent);
  const hasDisclosures = discloseYourBrand || discloseBrandedContent;

  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground italic">
          {`By posting, you agree to TikTok's `}
          <Link
            className="underline"
            to="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en"
            target="_blank"
            rel="noopener noreferrer"
          >
            Music Usage Confirmation
          </Link>
          {discloseBrandedContent ? (
            <>
              {` and `}
              <Link
                className="underline"
                to="https://www.tiktok.com/legal/page/global/bc-policy/en"
                target="_blank"
                rel="noopener noreferrer"
              >
                Branded Content Policy
              </Link>
            </>
          ) : null}
          .
        </p>

        <Alert
          variant="highlight"
          className={cn(discloseContent ? "" : "hidden")}
        >
          <AlertCircleIcon />
          <AlertTitle>
            {missingDisclosure
              ? "You need to indicate if your content promotes yourself, a third party, or both. "
              : `Your post will contain the following labels`}
          </AlertTitle>
          {hasDisclosures ? (
            <AlertDescription>
              <ul className="list-disc pl-4 ml-1">
                {discloseYourBrand && !discloseBrandedContent ? (
                  <li>{`Promotional content`}</li>
                ) : null}
                {discloseBrandedContent ? <li>{`Paid partnership`}</li> : null}
              </ul>
            </AlertDescription>
          ) : null}
        </Alert>
      </div>

      <FormField
        name="platform_configurations.tiktok.title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Title</FormLabel>
            <FormControl>
              <Input placeholder="Enter video title" {...field} />
            </FormControl>
          </FormItem>
        )}
      />

      <FormField
        name="platform_configurations.tiktok.privacy_status"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center gap-2">
              <FormLabel>Who can view this video</FormLabel>
              <Tooltip>
                <TooltipTrigger>
                  <CircleInfoIcon className="h-4 w-4" />
                </TooltipTrigger>
                <TooltipContent side="top">
                  Branded content cannot be set to private
                </TooltipContent>
              </Tooltip>
            </div>
            <FormControl>
              <ToggleGroup
                variant="outline"
                type="single"
                value={field.value}
                onValueChange={field.onChange}
              >
                <ToggleGroupItem value="public" className="px-3">
                  Public
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="private"
                  disabled={discloseBrandedContent}
                  className="px-3"
                >
                  Only Me
                </ToggleGroupItem>
              </ToggleGroup>
            </FormControl>
          </FormItem>
        )}
      />

      <FormGroup className="space-y-4">
        <FormField
          name="platform_configurations.tiktok.allow_comments"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Allow users to:</FormLabel>
              <FormControl>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    id="comment-switch"
                  />
                  <Label htmlFor="comment-switch">Comment</Label>
                </div>
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          name="platform_configurations.tiktok.allow_duet"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    id="duet-switch"
                  />
                  <Label htmlFor="duet-switch">Duet</Label>
                </div>
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          name="platform_configurations.tiktok.allow_stitch"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    id="stitch-switch"
                  />
                  <Label htmlFor="stitch-switch">Stitch</Label>
                </div>
              </FormControl>
            </FormItem>
          )}
        />
      </FormGroup>

      <FormGroup className="space-y-4">
        <FormField
          name="_disclose_content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Content Settings</FormLabel>
              <FormControl>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      if (!checked) {
                        form.setValue(
                          "platform_configurations.tiktok.disclose_your_brand",
                          false,
                        );
                        form.setValue(
                          "platform_configurations.tiktok.disclose_branded_content",
                          false,
                        );
                      }
                    }}
                    id="disclose-content-switch"
                  />
                  <Label htmlFor="disclose-content-switch">
                    Disclose video content
                  </Label>
                </div>
              </FormControl>
              <p className="text-xs italic text-muted-foreground ml-10 max-w-md">
                Turn on to disclose this video promotes goods or services in
                exchange for something of value. Your video could promote
                yourself, a third party, or both.
              </p>
            </FormItem>
          )}
        />

        <FormField
          name="platform_configurations.tiktok.disclose_your_brand"
          render={({ field }) => (
            <FormItem className="ml-6">
              <FormControl>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    id="your-brand-switch"
                    disabled={!discloseContent}
                  />
                  <Label htmlFor="your-brand-switch">Your Brand</Label>
                </div>
              </FormControl>
              <p className="text-xs italic text-muted-foreground ml-10 max-w-md">
                You are promoting yourself or your business. This video will be
                classified as Brand Organic
              </p>
            </FormItem>
          )}
        />

        <FormField
          name="platform_configurations.tiktok.disclose_branded_content"
          render={({ field }) => (
            <FormItem className="ml-6">
              <Tooltip>
                <TooltipTrigger asChild>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Switch
                        disabled={
                          !discloseContent || privacyStatus === "private"
                        }
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        id="branded-content-switch"
                      />
                      <Label htmlFor="branded-content-switch">
                        Branded Content
                      </Label>
                    </div>
                  </FormControl>
                </TooltipTrigger>
                <TooltipContent side="right">
                  You cannot set Branded Content on a post that is not public
                </TooltipContent>
              </Tooltip>
              <p className="text-xs italic text-muted-foreground ml-10 max-w-md">
                You are promoting another brand or third party. This video will
                be classified as Branded Content
              </p>
            </FormItem>
          )}
        />
      </FormGroup>
    </div>
  );
}
