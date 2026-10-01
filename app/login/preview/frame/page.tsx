import { notFound } from "next/navigation";

/**
 * The preview at a fixed width, for capturing a phone layout from a desktop
 * browser. Dev only, like the preview it frames.
 */
export default async function Frame({
  searchParams,
}: {
  searchParams: Promise<{ w?: string; view?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { w = "375", view = "dashboard" } = await searchParams;
  return (
    <iframe
      src={`/login/preview?view=${view}`}
      style={{ width: `${w}px`, height: "2800px", border: 0, display: "block" }}
    />
  );
}
