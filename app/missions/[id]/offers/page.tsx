"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Redirect /missions/[id]/offers -> /missions/[id]/applications
 * The applications page lives at /applications; /offers was a legacy/wrong path.
 */
export default function MissionOffersRedirect() {
  const params = useParams();
  const router = useRouter();
  const missionId = params.id as string;

  useEffect(() => {
    if (missionId) {
      router.replace(`/missions/${missionId}/applications`);
    }
  }, [missionId, router]);

  return (
    <div className="container mx-auto px-4 py-24">
      <p className="text-gray-500">Redirecting to applications...</p>
    </div>
  );
}
