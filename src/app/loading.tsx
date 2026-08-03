/**
 * Root suspense fallback — the first thing painted on a cold load of any
 * top-level route (login, setup, reset-password, the "/" redirect).
 *
 * Server Component by default: it ships no JS of its own, so it can render
 * before the route's client bundle has finished downloading.
 */

import { PageLoader } from "../components/ui/PageLoader";

export default function Loading() {
  return <PageLoader fullScreen hint="Preparing your workspace…" />;
}
