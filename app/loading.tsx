import { LoadingScreen } from "@/components/LoadingScreen";

/**
 * Streams the moment a request arrives, ahead of the signed-in layout — which
 * waits on the session and the whole dashboard before it can render a thing.
 * Without it, opening the app was a blank screen for as long as that took.
 */
export default function Loading() {
  return <LoadingScreen />;
}
