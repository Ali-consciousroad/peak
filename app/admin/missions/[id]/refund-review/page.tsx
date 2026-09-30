"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { remainingEscrow, releasedFromEscrow } from "@/lib/remaining-escrow";

type Person = {
  id?: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
};

type Currency = { code: string; symbol: string };

type OverdueRow = {
  id: string;
  title: string;
  deadline: string | null;
  gracePeriodEnd: string | null;
  potentialRefundAmount: number;
  totalPaid: number;
  totalAmount: number;
  client: Person;
  freelancer: Person | null;
  currency: Currency;
};

type RefundMission = OverdueRow & { status?: string };

type MissionPayment = {
  status?: string;
  amount?: number;
  paymentMethod?: string | null;
  currencies?: Currency | null;
};

type MissionPayload = {
  id: string;
  title: string;
  status?: string;
  deadline?: string | null;
  gracePeriodEnd?: string | null;
  dailyRate?: number;
  timeframe?: number;
  payments?: MissionPayment[];
  client?: Person;
  users_missions_clientIdTousers?: Person;
  contract?: { users_contracts_freelancerIdTousers?: Person | null };
  contracts?: { users_contracts_freelancerIdTousers?: Person | null };
};

const DEFAULT_CURRENCY: Currency = { code: "EUR", symbol: "€" };

function normalizeCurrency(currency?: { code?: string | null; symbol?: string | null } | null): Currency {
  return {
    code: currency?.code || DEFAULT_CURRENCY.code,
    symbol: currency?.symbol || DEFAULT_CURRENCY.symbol,
  };
}

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

function formatMoney(amount: number, symbol: string, code: string) {
  return `${symbol}${Number(amount).toFixed(2)} ${code}`;
}

function fromOverduePayload(row: OverdueRow): RefundMission {
  return {
    ...row,
    status: "OVERDUE",
    currency: normalizeCurrency(row.currency),
  };
}

function fromMissionPayload(mission: MissionPayload): RefundMission {
  const payments = Array.isArray(mission.payments) ? mission.payments : [];
  const escrowPayments = payments.map((payment) => ({
    status: payment.status || "",
    amount: payment.amount,
    paymentMethod: payment.paymentMethod,
  }));
  const totalPaid = releasedFromEscrow(escrowPayments);
  const totalAmount = Number(mission.dailyRate) * Number(mission.timeframe);
  const potentialRefundAmount = remainingEscrow(escrowPayments);

  return {
    id: mission.id,
    title: mission.title,
    status: mission.status,
    deadline: mission.deadline ?? null,
    gracePeriodEnd: mission.gracePeriodEnd ?? null,
    potentialRefundAmount,
    totalPaid,
    totalAmount,
    client: mission.client || mission.users_missions_clientIdTousers || {
      email: "",
      firstName: null,
      lastName: null,
    },
    freelancer:
      mission.contract?.users_contracts_freelancerIdTousers ||
      mission.contracts?.users_contracts_freelancerIdTousers ||
      null,
    currency: normalizeCurrency(payments[0]?.currencies),
  };
}

export default function AdminRefundReviewPage() {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();
  const params = useParams();
  const missionId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mission, setMission] = useState<RefundMission | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!isLoaded) return;
    if (!userId) {
      router.replace(`/sign-in?redirect=/admin/missions/${missionId}/refund-review`);
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
          const overdue = await overdueRes.json();
          const match = Array.isArray(overdue)
            ? overdue.find((row: OverdueRow) => row.id === missionId)
            : null;
          if (match) {
            const mapped = fromOverduePayload(match);
            setMission(mapped);
            setRefundAmount(mapped.potentialRefundAmount.toFixed(2));
            setLoading(false);
            return;
          }
        }

        const missionRes = await fetch(`/api/missions/${missionId}`);
        if (!missionRes.ok) {
          setLoadError("Mission not found.");
          setLoading(false);
          return;
        }
        const payload: MissionPayload = await missionRes.json();
        const mapped = fromMissionPayload(payload);
        setMission(mapped);
        setRefundAmount(mapped.potentialRefundAmount.toFixed(2));
      } catch (error) {
        console.error("Error loading refund review:", error);
        setLoadError("Could not load this mission.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isLoaded, userId, router, missionId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!mission) return;

    const amount = Number(refundAmount);
    if (!amount || amount <= 0) {
      alert("Enter a refund amount greater than 0.");
      return;
    }
    if (amount > mission.potentialRefundAmount) {
      alert(
        `Refund cannot exceed ${formatMoney(mission.potentialRefundAmount, mission.currency.symbol, mission.currency.code)}.`
      );
      return;
    }
    if (
      !confirm(
        `Refund ${formatMoney(amount, mission.currency.symbol, mission.currency.code)} to the client and reopen this mission?`
      )
    ) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/missions/${missionId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refundAmount: amount, reason: reason.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.error || "Refund failed.");
        return;
      }
      alert(data.message || "Refund processed.");
      router.push("/dashboard");
    } catch (error) {
      console.error("Error processing refund:", error);
      alert("Refund failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <p className="text-gray-600">Loading refund review…</p>
      </div>
    );
  }

  if (loadError || !mission) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24 max-w-2xl">
        <Button variant="outline" className="mb-4" onClick={() => router.push("/admin/overdue-missions")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Refund review</CardTitle>
            <CardDescription>{loadError || "Mission not found."}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isOverdue = mission.status === "OVERDUE";
  const symbol = mission.currency.symbol || "€";

  return (
    <div className="container mx-auto px-4 py-8 pt-24 max-w-3xl">
      <Button variant="outline" className="mb-4" onClick={() => router.push("/admin/overdue-missions")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Overdue missions
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>{mission.title}</CardTitle>
              <CardDescription>Manual refund after the grace period. No automatic refund.</CardDescription>
            </div>
            <Badge variant={isOverdue ? "destructive" : "outline"}>{mission.status || "UNKNOWN"}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Client</p>
              <p className="font-medium">{displayName(mission.client)}</p>
              <p className="text-gray-500">{mission.client?.email}</p>
            </div>
            <div>
              <p className="text-gray-500">Builder</p>
              <p className="font-medium">{displayName(mission.freelancer)}</p>
              <p className="text-gray-500">{mission.freelancer?.email || "—"}</p>
            </div>
            <div>
              <p className="text-gray-500">Deadline</p>
              <p className="font-medium">{formatDate(mission.deadline)}</p>
            </div>
            <div>
              <p className="text-gray-500">Grace period end</p>
              <p className="font-medium">{formatDate(mission.gracePeriodEnd)}</p>
            </div>
            <div>
              <p className="text-gray-500">Mission total</p>
              <p className="font-medium">
                {formatMoney(mission.totalAmount, symbol, mission.currency.code)}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Cannot refund — released to builder</p>
              <p className="font-medium">
                {formatMoney(mission.totalPaid, symbol, mission.currency.code)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Protected. Already paid out in milestones.</p>
            </div>
            <div className="md:col-span-2 rounded-md border border-green-200 bg-green-50 p-4">
              <p className="text-sm text-green-800">Can refund — remaining escrow</p>
              <p className="text-2xl font-semibold text-green-950">
                {formatMoney(mission.potentialRefundAmount, symbol, mission.currency.code)}
              </p>
              <p className="text-xs text-green-800 mt-1">
                This is the maximum you can send back to the client.
              </p>
            </div>
          </div>

          {!isOverdue ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              This mission is not OVERDUE, so a refund cannot be processed here.
              <div className="mt-3">
                <Link href={`/missions/${mission.id}`} className="font-medium underline">
                  Open mission page
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="refundAmount" className="block text-sm font-medium mb-1">
                  Refund amount
                </label>
                <Input
                  id="refundAmount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={mission.potentialRefundAmount}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  required
                />
                <p className="text-sm text-gray-600 mt-1">
                  Maximum {formatMoney(mission.potentialRefundAmount, symbol, mission.currency.code)} (held in escrow)
                </p>
              </div>
              <div>
                <label htmlFor="reason" className="block text-sm font-medium mb-1">
                  Reason (optional)
                </label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why this refund is issued"
                  rows={3}
                />
              </div>
              <Button type="submit" disabled={submitting || mission.potentialRefundAmount <= 0}>
                {submitting ? "Processing…" : "Process refund"}
              </Button>
              {mission.potentialRefundAmount <= 0 && (
                <p className="text-sm text-gray-600">
                  {mission.totalPaid > 0
                    ? `Nothing can be refunded. The full ${formatMoney(mission.totalPaid, symbol, mission.currency.code)} already went to the builder.`
                    : "Nothing can be refunded. There is no money in escrow (payment still pending or never funded)."}
                </p>
              )}
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
