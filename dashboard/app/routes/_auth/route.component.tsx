import { Link, Outlet } from "react-router";
import { Logo } from "~/components/logo";

export function Component() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-3 md:p-6">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link
            to="https://www.postforme.dev"
            className="flex items-center gap-2 font-semibold text-2xl"
            target="_blank"
          >
            <Logo className="h-6" />
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <Outlet />
          </div>
        </div>
      </div>
      <div className="bg-gray-100 relative hidden lg:flex flex-col items-center justify-center p-8">
        <h1 className="z-10 self-start text-5xl text-balance text- font-bold leading-tight">
          Automate posting to TikTok, Facebook, YouTube, Instagram and more in
          minutes.
        </h1>

        <img
          src="/posting-visual.png"
          alt="A visual graph showing Post for Me as a single entry point to posting to Facebook, Instagram, TikTok, YouTube, LinkedIn, X (Twitter), Pinterest, Bluesky, and Threads."
          className="mt-auto w-full object-contain dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  );
}
