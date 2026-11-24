/**
 * The avatar size scale — the base `~/ui/avatar` primitive's own 3-step `size`
 * prop, surfaced as a named type. `UserAvatar` / `PlatformAvatar` forward it
 * straight to the base, so the box, the status dot (`AvatarBadge`), and the group
 * `+N` chip (`AvatarGroupCount`) all scale proportionally through the base's
 * `data-size` mechanism — there are no custom size maps here (a plain `size-*`
 * className can't beat the base's `data-[size]` specificity anyway).
 */
export type AvatarSize = "default" | "lg" | "sm";
