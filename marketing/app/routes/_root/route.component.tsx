import { Outlet } from "react-router";

import { Navbar } from "~/components/navbar";
import { Footer } from "~/components/footer";

export function Component() {
  return (
    <div className="relative">
      <Navbar />

      <div className="pb-12">
        <Outlet />
      </div>

      <Footer />
    </div>
  );
}
