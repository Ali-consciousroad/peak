"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MyMissionsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to missions page with IN_PROGRESS filter for consistency
    router.replace("/missions?status=IN_PROGRESS");
  }, [router]);

  return null;
}
