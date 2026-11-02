import { Button } from "~/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/ui/dialog";

import { Section } from "./section";

export function DialogDemo() {
  return (
    <div className="space-y-8">
      <Section title="Basic">
        <Dialog>
          <DialogTrigger render={<Button variant="outline">Open dialog</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete project</DialogTitle>
              <DialogDescription>
                This action cannot be undone. This permanently deletes the
                project and everything in it.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="ghost">Cancel</Button>} />
              <DialogClose
                render={<Button variant="destructive">Delete</Button>}
              />
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Section>
    </div>
  );
}
