import { Outlet } from "react-router";

import { Navbar } from "./components/navbar";
import { Footer } from "./components/footer";

export function Component() {
  return (
    <div className="space-y-8">
      <Navbar />

      <div className="container p-4 mx-auto">
        <Outlet />
      </div>

      <Footer />
    </div>
  );
}
