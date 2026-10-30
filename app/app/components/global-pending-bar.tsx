import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslation } from "react-i18next";
import { useNavigation } from "react-router";

/**
 * A thin progress bar pinned to the top of the viewport that appears while a
 * route navigation is in flight — the feedback the browser used to give us for
 * free (tab spinner / native progress) before React Router took navigation
 * client-side. During a client-side nav the old page stays on screen until the
 * next route's loader resolves, so without this a slow loader looks like
 * nothing happened on click. It covers the post-login redirect, signing out,
 * and the accounts list's URL-driven search/filter/sort/pagination — all
 * navigations.
 *
 * Deliberately navigation-ONLY: this does NOT track `useFetchers`. A fetcher
 * submission (e.g. disconnect/delete) is a local, blocking-one-thing action, so
 * its feedback belongs on the element that triggered it (a button spinner /
 * dialog pending state), not hoisted into a global indicator.
 *
 * Indeterminate by design (the server round-trip has no measurable progress):
 * a segment sweeps across while busy, and the whole bar fades in/out via
 * AnimatePresence so quick transitions don't flicker harshly. Honors
 * `prefers-reduced-motion` by pulsing opacity instead of sweeping.
 */
export function GlobalPendingBar() {
  const { t } = useTranslation();

  const navigation = useNavigation();
  const reduceMotion = useReducedMotion();

  const busy = navigation.state !== "idle";

  return (
    <AnimatePresence>
      {busy ? (
        <motion.div
          className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-0.5 overflow-hidden bg-primary/15"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="progressbar"
          aria-busy="true"
          aria-label={t("common.loading")}
        >
          {reduceMotion ? (
            <motion.div
              className="h-full w-full bg-primary"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            />
          ) : (
            <motion.div
              className="h-full w-2/5 bg-primary"
              animate={{ x: ["-120%", "320%"] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
