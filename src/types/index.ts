/**
 * Barrel for the type layer.
 *
 * `domain.ts`  — persistence shapes, mirroring `src/models/`. Server-side only.
 * `api.ts`     — wire shapes returned by the routes. What components consume.
 *
 * Import from `src/types` rather than reaching into either file directly.
 */
export * from "./domain";
export * from "./api";
