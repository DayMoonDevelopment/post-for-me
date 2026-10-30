"use client";

import type { DragEvent } from "react";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { DragHandleIcon as GripVertical, MediaIcon as Image, InfoIcon as Info, AddIcon as Plus, VideoIcon as Video, CloseIcon as X } from "~/icons";
import { cn } from "~/lib/utils";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentMedia,
  AttachmentTitle,
} from "~/ui/attachment";
import { Button } from "~/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/ui/tooltip";

/** A picked media item — enough to preview and identify it. `previewUrl` (a local object URL)
 * or `url` (a hosted URL) renders the thumbnail. Structurally satisfied by the composer's
 * `SocialPostComposerMedia`. */
export interface SocialPostMediaItem {
  id: string;
  name?: string;
  previewUrl?: string;
  url?: string;
}

/** Video file extensions — used to tag an item as video vs image (object URLs have no
 * extension, so the file name is the reliable signal). */
const VIDEO_EXTENSIONS = /\.(mp4|mov|webm|m4v|avi|mkv|ogv|3gp|mpe?g)$/i;

function isVideoItem(item: SocialPostMediaItem): boolean {
  return VIDEO_EXTENSIONS.test(item.name ?? item.url ?? "");
}

/** The shared dashed-tile look for the leading add-tile and the empty-state dropzone. */
const DROPZONE =
  "flex flex-col items-center justify-center rounded-lg border border-dashed text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground";

/** The bordered-chip remove control shared by both layouts (matches the account-cluster "×"). */
const REMOVE_CHIP =
  "rounded-full border border-muted-foreground/40 bg-background text-foreground ring-2 ring-background";

const GRIP = (
  <GripVertical aria-hidden />
);

const CROSS = (
  <X className="size-3"
    aria-hidden />
);

function VideoBadge({ size = "size-8" }: { size?: string }) {
  const { t } = useTranslation();

  return (
    <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <span
        className={cn(
          "flex items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm",
          size,
          size === "size-8" ? "[&_svg]:size-3.5" : "[&_svg]:size-3",
        )}
      >
        <Video aria-label={t("playground.videoLabel")} />
      </span>
    </span>
  );
}

export interface SocialPostMediaProps {
  /** `accept` for the file input. */
  accept?: string;
  addLabel?: string;
  className?: string;
  emptyLabel?: string;
  /** Accessible name for the info trigger. */
  infoLabel?: string;
  /** Tooltip text — accepted types + size. Omit to hide the info tooltip. */
  infoText?: string;
  label?: string;
  /** Add picked/dropped files. */
  onAdd: (files: FileList | null) => void;
  /** Remove one item by id. */
  onRemove: (id: string) => void;
  /** Reorder handler (the new ordered array). Omit to disable drag-to-reorder. */
  onReorder?: (items: SocialPostMediaItem[]) => void;
  removeLabel?: (name: string) => string;
  /** Accessible name for a row's drag handle (mobile). */
  reorderLabel?: (name: string) => string;
  /** The attached media items. */
  value: SocialPostMediaItem[];
}

/**
 * The media picker for a social post: a **leading**, icon-only add tile that also accepts
 * **dropped** files, beside a horizontally-scrolling strip of just the attached items — plus a
 * full-width **empty-state** dropzone and an **info tooltip** (accepted types + size) by the
 * label. On small screens (`<md`) it switches to a **vertical stack** — an add row on top, then
 * one horizontal row per item — so there's no horizontal scroll (and no touch scroll-vs-drag
 * conflict). Reordering is powered by **dnd-kit** (whole-card drag on desktop; a per-row drag
 * handle on mobile so the page still scrolls). Controlled: hand it `value` + `onAdd`/`onRemove`.
 * Nothing uploads here — that's the caller's job at publish time (see `useSocialPostComposer`).
 */
export function SocialPostMedia({
  value,
  onAdd,
  onRemove,
  onReorder,
  accept = "image/*,video/*",
  label = "Media",
  addLabel = "Add media",
  emptyLabel = "Drag & drop or click to add media",
  infoLabel = "Media requirements",
  infoText,
  removeLabel = (name) => `Remove ${name}`,
  reorderLabel = (name) => `Reorder ${name}`,
  className,
}: SocialPostMediaProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const reduceMotion = useReducedMotion();
  const canReorder = typeof onReorder === "function";
  // Stable, per-instance ids so dnd-kit's generated a11y ids match across SSR/hydration.
  const dndId = useId();

  // One sensor set for both layouts: a small activation distance so a click/scroll never starts a
  // drag, plus keyboard reordering for accessibility. On mobile the listeners live on a dedicated
  // handle (with `touch-none`), so a touch-drag on the handle reorders while the page still scrolls.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = value.findIndex((m) => m.id === active.id);
    const to = value.findIndex((m) => m.id === over.id);
    if (from === -1 || to === -1) return;
    onReorder?.(arrayMove(value, from, to));
  };
  const ids = value.map((m) => m.id);

  const openPicker = () => inputRef.current?.click();
  // Robust drag tracking: a depth counter so the cursor crossing child cards (each firing its own
  // dragenter/dragleave) doesn't flicker the dropzone — it only clears when we've truly left.
  const dropProps = {
    onDragEnter: (event: DragEvent) => {
      event.preventDefault();
      dragDepth.current += 1;
      setDragging(true);
    },
    onDragOver: (event: DragEvent) => event.preventDefault(),
    onDragLeave: (event: DragEvent) => {
      event.preventDefault();
      dragDepth.current -= 1;
      if (dragDepth.current <= 0) {
        dragDepth.current = 0;
        setDragging(false);
      }
    },
    onDrop: (event: DragEvent) => {
      event.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      onAdd(event.dataTransfer.files);
    },
  };
  const dragActive = dragging && "border-primary bg-primary/5 text-foreground";

  return (
    <div className={cn("grid min-w-0 gap-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium">{label}</span>
          {infoText ? (
            <Tooltip>
              {/* Plain trigger (no render/asChild) keeps this base-agnostic; it renders as a
                  focusable button, so reset the native chrome. */}
              <TooltipTrigger
                aria-label={infoLabel}
                className="inline-flex appearance-none border-0 bg-transparent p-0 text-muted-foreground/70 transition-colors hover:text-foreground [&_svg]:size-3.5"
              >
                <Info aria-hidden />
              </TooltipTrigger>
              <TooltipContent>{infoText}</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
        {/* Mobile add action — a proper Button on the opposing edge of the label. Desktop adds via
            the strip's leading tile / empty-state dropzone, so this is mobile-only. */}
        <Button type="button" onClick={openPicker} className="md:hidden">
          <Plus aria-hidden />
          {addLabel}
        </Button>
      </div>

      {/* Desktop (md+): a compact horizontal strip — scroll + drag-reorder + drag-and-drop. */}
      <div className="hidden min-w-0 md:block">
        {value.length === 0 ? (
          <button
            type="button"
            onClick={openPicker}
            aria-label={addLabel}
            {...dropProps}
            className={cn(DROPZONE, "h-36 w-full gap-1.5", dragActive)}
          >
            <Image className="size-6"
              aria-hidden />
            <span className="text-xs">{emptyLabel}</span>
          </button>
        ) : (
          <div className="relative flex gap-1.5 min-w-0 items-stretch" {...dropProps}>
            <button
              type="button"
              onClick={openPicker}
              aria-label={addLabel}
              // `my-1` matches the strip's `py-1`, so the tile top/bottom line up with the item
              // cards (which are inset by that padding) instead of the container's edges.
              className={cn(DROPZONE, "my-1 w-30 shrink-0 [&_svg]:size-6", dragActive)}
            >
              <Plus aria-hidden />
            </button>

            {/* The strip IS the scroll container (feather + scrollbar + snap). `px-3` insets the
                items so the edge feather lands on the padding at rest; keep `scroll-px-3` matching
                it so snap lands scrollLeft:0 (see the initial-mount fix). dnd-kit powers reorder. */}
            <DndContext
              id={`${dndId}-desktop`}
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={ids} strategy={horizontalListSortingStrategy}>
                <div className="flex min-w-0 flex-1 scroll-fade-x snap-x snap-mandatory scroll-px-3 scrollbar-none gap-2 overflow-x-auto overscroll-x-contain px-3 py-1">
                  <AnimatePresence initial={false}>
                    {value.map((item) => (
                      <SortableCard
                        key={item.id}
                        item={item}
                        disabled={!canReorder}
                        reduceMotion={reduceMotion}
                        removeLabel={removeLabel}
                        onRemove={onRemove}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </SortableContext>
            </DndContext>

            {/* Whole-area dropzone overlay — fades in while files are dragged over the strip so the
                drop target isn't just the small add-tile. `pointer-events-none` lets the drag events
                fall through to this wrapper's handlers. */}
            <AnimatePresence>
              {dragging ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-primary bg-background/85 text-sm font-medium text-primary [&_svg]:size-5"
                >
                  <Image aria-hidden />
                  {emptyLabel}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Mobile (<md): a vertical stack — one row per item (add via the header Button). No
          horizontal scroll (removes the overscroll/gesture conflict); drag a row's handle to
          reorder. */}
      <div className="grid gap-2 md:hidden">
        <DndContext
          id={`${dndId}-mobile`}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <AnimatePresence initial={false}>
              {value.map((item) => (
                <SortableRow
                  key={item.id}
                  item={item}
                  disabled={!canReorder}
                  reduceMotion={reduceMotion}
                  removeLabel={removeLabel}
                  reorderLabel={reorderLabel}
                  onRemove={onRemove}
                />
              ))}
            </AnimatePresence>
          </SortableContext>
        </DndContext>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        hidden
        onChange={(event) => {
          onAdd(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}

interface SortableItemProps {
  disabled: boolean;
  item: SocialPostMediaItem;
  onRemove: (id: string) => void;
  reduceMotion: boolean | null;
  removeLabel: (name: string) => string;
}

/** Desktop card — the whole card is the drag handle (a small activation distance keeps clicks and
 * the remove button working). Motion owns only the add/remove opacity fade; dnd-kit owns the drag
 * transform (applied to a separate inner element, so they never fight over `transform`). */
function SortableCard({
  item,
  disabled,
  reduceMotion,
  removeLabel,
  onRemove,
}: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, disabled });
  return (
    <motion.div
      layout={false}
      initial={reduceMotion ? false : { opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
      transition={{ duration: 0.15 }}
      className="flex-none snap-start"
    >
      <div
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition }}
        {...(disabled ? {} : attributes)}
        {...(disabled ? {} : listeners)}
        className={cn(
          "relative outline-none",
          !disabled && "cursor-grab touch-none active:cursor-grabbing",
          isDragging && "z-30 opacity-80",
        )}
      >
        <Attachment orientation="vertical" state="done" className="select-none">
          <AttachmentMedia variant="image">
            <img src={item.previewUrl ?? item.url} alt={item.name} draggable={false} />
            {isVideoItem(item) ? <VideoBadge /> : null}
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>{item.name}</AttachmentTitle>
          </AttachmentContent>
          {/* Reshape the AttachmentAction (a ghost Button; its hover:bg-muted already matches) into
              the account-cluster avatar's "×" chip, tucked onto the card's top corner. */}
          <AttachmentActions className="group-data-[orientation=vertical]/attachment:top-1.5 group-data-[orientation=vertical]/attachment:end-1.5">
            <AttachmentAction
              aria-label={removeLabel(item.name ?? "")}
              onClick={() => onRemove(item.id)}
              className={REMOVE_CHIP}
            >
              {CROSS}
            </AttachmentAction>
          </AttachmentActions>
        </Attachment>
      </div>
    </motion.div>
  );
}

/** Mobile row — reorder is initiated only from the leading grip handle (listeners + `touch-none`
 * live on the handle), so a swipe anywhere else still scrolls the page. */
function SortableRow({
  item,
  disabled,
  reduceMotion,
  removeLabel,
  reorderLabel,
  onRemove,
}: SortableItemProps & { reorderLabel: (name: string) => string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, disabled });
  const name = item.name ?? "";
  return (
    <motion.div
      layout={false}
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <div
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition }}
        className={cn("relative", isDragging && "z-30 opacity-80")}
      >
        <Attachment orientation="horizontal" state="done" className="w-full select-none">
          {disabled ? null : (
            <button
              type="button"
              aria-label={reorderLabel(name)}
              {...attributes}
              {...listeners}
              className="flex shrink-0 cursor-grab touch-none items-center justify-center self-stretch px-0.5 text-muted-foreground outline-none active:cursor-grabbing [&_svg]:size-4"
            >
              {GRIP}
            </button>
          )}
          <AttachmentMedia variant="image">
            <img src={item.previewUrl ?? item.url} alt={item.name} />
            {isVideoItem(item) ? <VideoBadge size="size-5" /> : null}
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>{item.name}</AttachmentTitle>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction
              aria-label={removeLabel(name)}
              onClick={() => onRemove(item.id)}
            >
              {CROSS}
            </AttachmentAction>
          </AttachmentActions>
        </Attachment>
      </div>
    </motion.div>
  );
}
