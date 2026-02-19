// Node's fetch (undici) supports RequestInit.duplex for streaming request bodies,
// but the DOM RequestInit type shipped with TypeScript doesn't include it.
// This keeps typechecking happy while using duplex: "half" at runtime.

export {};

declare global {
  interface RequestInit {
    duplex?: "half";
  }
}
