---
name: motion
description: Animate UI with Motion (the library formerly named Framer Motion, npm package `motion`) in this project's React Router v7 apps — primarily marketing/. Use when adding or editing any animation, transition, scroll effect, gesture (hover/tap/in-view), layout/shared-element animation, or enter/exit transition; when importing `motion`, `AnimatePresence`, `useScroll`, `useTransform`, `useReducedMotion`, etc.; or when reviewing animation code for correctness, performance, or reduced-motion support. Covers our import convention, SSR setup, the core API, performance rules, and accessibility. This is a thin in-house summary of the public Motion docs (motion.dev) — verify against the live docs for anything beyond the basics.
---

# Motion

We use **Motion** v12 (npm `motion` — this is Framer Motion, renamed). It's installed in `marketing/`. This skill is the project overlay; for anything not here, check the live docs at **motion.dev** (the API moves fast).

## Two hard rules for this repo

1. **Import from `motion/react`. Never `framer-motion`.** The old `framer-motion` package is legacy; lots of LLM/training data still uses it. Our codebase standardizes on `motion/react`.
   ```ts
   import { motion, AnimatePresence, type Transition, type HTMLMotionProps } from "motion/react";
   import { useScroll, useTransform, useReducedMotion, MotionConfig } from "motion/react";
   ```
2. **It runs under SSR.** Both React Router apps render on the server. In `marketing/vite.config.ts`, Motion is pre-bundled via `optimizeDeps: { include: ["motion"] }` (avoids dev-server dep-optimization stalls). If you add Motion to another sibling and hit SSR/hydration errors, mirror that `optimizeDeps.include` entry (and add `motion` to `ssr.noExternal` only if a transform error surfaces — currently only posthog is listed there). No `"use client"` directive — that's a Next.js concept, not React Router.

## Core API

```tsx
// Enter animation
<motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} />

// Transition (tween or spring)
<motion.div animate={{ x: 100 }} transition={{ duration: 0.3, ease: "easeOut" }} />
<motion.div animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.25 }} />

// Keyframes (array); `null` = "from current value"
<motion.div animate={{ x: [0, 100, 0] }} />

// Variants — name states once, orchestrate parent → children
const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };
<motion.ul initial="hidden" animate="show"
  variants={{ show: { transition: { staggerChildren: 0.06 } } }}>
  <motion.li variants={item} />
</motion.ul>
```

**Transform shortcuts** (these compile to GPU-friendly `transform`, not layout props): `x`, `y`, `z`, `scale`, `scaleX/Y`, `rotate`, `rotateX/Y/Z`, `skewX/Y`. Prefer these over animating `top`/`left`/`width`/`height`.

**Transition options:** `type: "spring"` (`stiffness`, `damping`, `mass`, `bounce` 0–1, or `visualDuration`) · `type: "tween"` (`duration`, `ease`: `"linear"|"easeIn|Out|InOut"|"circIn"|"backIn"|"anticipate"` or a cubic-bézier array `[0.17,0.67,0.83,0.67]`) · `delay`, `repeat` (number/`Infinity`), `repeatType: "loop"|"reverse"|"mirror"` · orchestration via variants: `staggerChildren`, `delayChildren`, `when: "beforeChildren"|"afterChildren"`.

## Enter / exit — `AnimatePresence`

`exit` only runs inside `<AnimatePresence>`, and **every direct child needs a stable, unique `key`**. Our canonical example is `marketing/app/components/rotating-text.tsx`:

```tsx
<AnimatePresence mode="wait">
  <motion.div key={currentText}
    initial={{ opacity: 0, y: -y }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y }}
    transition={{ duration: 0.3, ease: "easeOut" }}>
    {currentText}
  </motion.div>
</AnimatePresence>
```
`mode="wait"` = finish exit before the next enters. Forgetting `key`, or animating a conditional without wrapping it in `AnimatePresence`, is the #1 reason exits silently don't fire.

## Scroll

```tsx
// Reveal on scroll into view — the simplest option, prefer it for marketing sections.
<motion.section initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, amount: 0.3 }} />   // once = animate first time only; amount = % visible to trigger

// Scroll-linked (progress → value). Drives a motion value through style — do NOT read .get() in render.
const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
const opacity = useTransform(scrollYProgress, [0, 1], [0, 1]);
return <motion.div ref={ref} style={{ opacity }} />;
```
`useScroll` runs on the native `ScrollTimeline` where possible (hardware-accelerated). Pass motion values to `style`, never to `animate`.

## Gestures

```tsx
<motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} whileFocus={{ scale: 1.04 }} />
```
Values can be inline objects or variant names (`whileHover="hover"`). `whileTap` fires on press-and-release on the same element; focus follows `:focus-visible`.

## Layout animations

```tsx
<motion.div layout />                       // auto-animate size/position changes
<motion.div layoutId="card-3" />            // shared-element transition across mount/unmount
<LayoutGroup>{...}</LayoutGroup>            // sync layout across siblings that re-render independently
```
**Gotcha:** layout animations scale the parent, which distorts children. Fix: add `layout` to the children too (Motion counter-scales them), or `layout="position"` for elements whose aspect ratio changes (images) to animate position only.

## Accessibility — not optional on the marketing site

Respect reduced-motion. Easiest is the global policy:
```tsx
import { MotionConfig } from "motion/react";
<MotionConfig reducedMotion="user">{children}</MotionConfig>   // disables transform/layout anims, keeps opacity
```
For per-component control:
```tsx
import { useReducedMotion } from "motion/react";
const reduce = useReducedMotion();
const y = reduce ? 0 : useTransform(scrollYProgress, [0, 1], [0, -40]);   // kill parallax when reduced
```

## Gotchas / anti-patterns

- **`from "framer-motion"`** — always rewrite to `motion/react`.
- **Animating layout properties** (`width`, `height`, `top`, `left`, `margin`) — janky; use transforms (`scale`, `x`, `y`) or the `layout` prop.
- **`exit` without `AnimatePresence`**, or missing/unstable `key` on its children — exit won't run.
- **Reading a motion value with `.get()` during render** — it won't re-render. Bind it through `style={{ ... }}` (or `useMotionValueEvent` for side effects).
- **Heavy `whileInView` without `viewport={{ once: true }}`** — re-triggers every scroll-in; usually you want `once`.
- **Skipping reduced-motion** — large parallax/auto-playing motion must degrade. Default to `MotionConfig reducedMotion="user"` at the app root.
- **Type the props:** reuse `HTMLMotionProps<"div">` and `Transition` from `motion/react` for wrapper components (see `rotating-text.tsx`), don't hand-roll.
