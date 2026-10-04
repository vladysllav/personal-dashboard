import { auth } from "@/auth";
import { Dashboard } from "@/components/Dashboard";

export default async function TodayPage() {
  // The session already came through the layout's guard; this reads the name
  // and picture off it so the profile row renders server-side with the rest.
  const session = await auth();

  return (
    <Dashboard
      account={{
        name: session?.user?.name,
        image: session?.user?.image,
        email: session?.user?.email,
      }}
    />
  );
}
