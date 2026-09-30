"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Person = {
  id?: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
};

type OverdueMission = {
  id: string;
  title: string;
  deadline: string | null;
  gracePeriodEnd: string | null;
  potentialRefundAmount: number;
  totalPaid: number;
  totalAmount: number;
  client: Person;
  freelancer: Person | null;
  currency: { code: string; symbol: string };
};

function displayName(person: Person | null) {
  if (!person) return "—";
  const name = [person.firstName, person.lastName].filter(Boolean).join(" ");
  return name || person.email;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminOverdueMissionsPage() {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [missions, setMissions] = useState<OverdueMission[]>([]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!userId) {
      router.replace("/sign-in?redirect=/admin/overdue-missions");
      return;
    }

    const load = async () => {
      try {
        const meRes = await fetch("/api/me");
        if (!meRes.ok) {
          router.replace("/sign-in");
          return;
        }
        const me = await meRes.json();
        if (!me.isAdmin) {
          router.replace("/");
          return;
        }

        const overdueRes = await fetch("/api/admin/overdue-missions");
        if (overdueRes.ok) {
          const data = await overdueRes.json();
          setMissions(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Error loading overdue missions:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isLoaded, userId, router]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <p className="text-gray-600">Loading overdue missions…</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-24 max-w-5xl">
      <Card>
        <CardHeader>
          <CardTitle>Overdue missions</CardTitle>
          <CardDescription>
            Past grace period. Review and process a manual refund if needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {missions.length === 0 ? (
            <p className="text-sm text-gray-600">No missions currently need refund review.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="py-2 pr-4 font-medium">Mission</th>
                    <th className="py-2 pr-4 font-medium">Client</th>
                    <th className="py-2 pr-4 font-medium">Builder</th>
                    <th className="py-2 pr-4 font-medium">Grace ended</th>
                    <th className="py-2 pr-4 font-medium">Max refund</th>
                    <th className="py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {missions.map((mission) => {
                    const symbol = mission.currency?.symbol || "€";
                    return (
                      <tr key={mission.id} className="border-b last:border-0">
                        <td className="py-3 pr-4">
                          <Link href={`/missions/${mission.id}`} className="font-medium hover:underline">
                            {mission.title}
                          </Link>
                          <div className="mt-1">
                            <Badge variant="destructive">OVERDUE</Badge>
                          </div>
                        </td>
                        <td className="py-3 pr-4">{displayName(mission.client)}</td>
                        <td className="py-3 pr-4">{displayName(mission.freelancer)}</td>
                        <td className="py-3 pr-4">{formatDate(mission.gracePeriodEnd)}</td>
                        <td className="py-3 pr-4 font-medium">
                          {symbol}
                          {Number(mission.potentialRefundAmount).toFixed(2)}
                        </td>
                        <td className="py-3 text-right">
                          <Button asChild size="sm">
                            <Link href={`/admin/missions/${mission.id}/refund-review`}>
                              Review refund
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
