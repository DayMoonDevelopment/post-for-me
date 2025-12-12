import { Button } from "~/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "~/ui/sheet";
import { Menu } from "lucide-react";
import { Logo } from "~/components/logo";
import { NavMenu } from "./nav-menu";

export const NavigationSheet = () => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent className="px-6 py-3">
        <Logo className="h-7 self-start ml-1.5" />
        <NavMenu orientation="vertical" className="mt-6 [&>div]:h-full" />
      </SheetContent>
    </Sheet>
  );
};
