/**
 * Suspense fallback for every dashboard route segment.
 *
 * `loading.tsx` nests *inside* `layout.tsx`, so the sidebar and header stay
 * mounted and interactive while the page below streams in — hence
 * `fullScreen={false}`, which fills only the content column. A full-viewport
 * loader here would blank the chrome on every tab change.
 */

import { PageLoader } from "../../components/ui/PageLoader";

export default function DashboardLoading() {
  return <PageLoader message="Loading workspace" />;
}
