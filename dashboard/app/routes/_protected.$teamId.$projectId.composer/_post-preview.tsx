import { useFormContext } from "react-hook-form";
import {
  BookmarkIcon,
  HeartIcon,
  MessageCircleIcon,
  ShareIcon,
} from "lucide-react";
import { EyeOpenIcon } from "~/components/icons";

import { cn } from "~/lib/utils";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "~/ui/dialog";
import { Button } from "~/ui/button";
import { Card, CardContent } from "~/ui/card";
import { Avatar, AvatarImage } from "~/ui/avatar";

import type { FormSchema } from "./schema";

export function PostPreview() {
  const { watch } = useFormContext();
  const formValues = watch() as FormSchema;

  const previewSrc = formValues.media?.[0]?.url;
  const profileImg =
    "https://www.placeholderimage.online/images/avatar/avatar-image-05.png";
  const caption = formValues.caption;
  const handle = "postformedev";

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" type="button">
          <EyeOpenIcon />
          Preview Post
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Post Preview</DialogTitle>
          <DialogDescription>
            {`Based on the way you've configured your post, this is a preview of what the post will look like.`}
          </DialogDescription>
        </DialogHeader>
        <Card className="rounded-xl overflow-hidden relative max-h-[70vh] aspect-[9/16] mx-auto py-0">
          {/* Display video preview or placeholder message */}
          <div className="flex items-center justify-center aspect-[9/16] w-full bg-muted">
            {previewSrc ? (
              <video
                src={previewSrc}
                className="h-full w-full object-cover"
                controls={false}
                muted
                loop
                playsInline
                autoPlay
              />
            ) : (
              <p className="text-sm max-w-xs text-center font-semibold">
                {
                  "Select a video file to post to TikTok. If you select more than 1, we'll use the first"
                }
              </p>
            )}
          </div>

          <CardContent className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/30 to-transparent p-4 text-white z-[10] flex flex-row justify-between items-end gap-6">
            <div className="flex-1 flex flex-col gap-0.5 text-xs">
              <p className="font-semibold">{handle}</p>
              <div
                className={cn("line-clamp-2", !caption && "italic opacity-80")}
              >
                {caption || "Enter a caption to see a preview..."}
              </div>
            </div>

            <div className="flex flex-col gap-6 [&_svg]:size-6">
              <HeartIcon className="text-transparent fill-white" />
              <MessageCircleIcon className="text-transparent fill-white" />
              <BookmarkIcon className="text-transparent fill-white" />
              <ShareIcon className="text-white fill-none" />
              <Avatar className="size-6">
                <AvatarImage src={profileImg} />
              </Avatar>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
