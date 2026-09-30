"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Edit3, Eye, Save, Star, X } from "lucide-react";

interface CurrentUser {
  id: string;
  role: string;
  email: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    companyName?: string;
  };
  description?: string;
}

interface Mission {
  id: string;
  title: string;
  status: string;
  createdAt?: string;
  contract?: {
    isActive: boolean;
  } | null;
  client?: {
    id: string;
  };
}

interface Review {
  id: string;
  content: string;
  rating: number;
  createdAt: string;
  reviewer?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    companyName?: string | null;
  };
  mission?: {
    title?: string | null;
  };
}

const MIN_DESCRIPTION = 150;
const MAX_DESCRIPTION = 1500;

export default function ClientAboutPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionText, setDescriptionText] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const meRes = await fetch("/api/me");
        if (!meRes.ok) throw new Error("Failed to load profile");
        const meData = await meRes.json();
        const me: CurrentUser = {
          id: meData.id,
          role: meData.role,
          email: meData.email,
          profile: meData.profile,
          description: meData.description || "",
        };
        setCurrentUser(me);
        setDescriptionText(me.description || "");

        if (me.id !== params.id && me.role !== "admin") {
          router.replace(`/clients/${me.id}`);
          return;
        }

        const missionsRes = await fetch("/api/missions");
        if (!missionsRes.ok) throw new Error("Failed to load projects");
        const missionsData = await missionsRes.json();
        const allMissions: Mission[] = Array.isArray(missionsData) ? missionsData : [];
        const filteredForClient = allMissions.filter((m) => m.client?.id === params.id);
        setMissions(filteredForClient);

        const reviewsRes = await fetch(`/api/reviews?receiverId=${params.id}`);
        if (reviewsRes.ok) {
          const reviewsData = await reviewsRes.json();
          setReviews(Array.isArray(reviewsData) ? reviewsData : []);
        }
      } catch (error) {
        console.error("Error loading client about page:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [params.id, router]);

  const displayName = useMemo(() => {
    if (!currentUser) return "Client";
    const first = currentUser.profile?.firstName || "";
    const last = currentUser.profile?.lastName || "";
    const fullName = `${first} ${last}`.trim();
    if (fullName) return fullName;
    return currentUser.email?.split("@")[0] || "Client";
  }, [currentUser]);

  const companyName = currentUser?.profile?.companyName?.trim();

  const effectiveStatus = (m: Mission) => {
    if (m.status === "IN_PROGRESS" || m.status === "OVERDUE") {
      return m.contract?.isActive ? m.status : "OPEN";
    }
    return m.status;
  };

  const missionStats = useMemo(
    () =>
      missions.reduce(
        (acc, mission) => {
          const status = effectiveStatus(mission);
          if (status === "OPEN") acc.open += 1;
          if (status === "IN_PROGRESS" || status === "OVERDUE") acc.inProgress += 1;
          if (status === "COMPLETED") acc.completed += 1;
          if (status === "REFUNDED") acc.refunded += 1;
          return acc;
        },
        { open: 0, inProgress: 0, completed: 0, refunded: 0 }
      ),
    [missions]
  );

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    return reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length;
  }, [reviews]);

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${star <= Math.round(rating) ? "text-yellow-400 fill-current" : "text-gray-300"}`}
          />
        ))}
      </div>
    );
  };

  const getReviewerName = (review: Review) => {
    const first = review.reviewer?.firstName || "";
    const last = review.reviewer?.lastName || "";
    const fullName = `${first} ${last}`.trim();
    if (fullName) return fullName;
    if (review.reviewer?.email) return review.reviewer.email.split("@")[0];
    return "Anonymous";
  };

  const handleSaveDescription = async () => {
    const trimmed = descriptionText.trim();
    if (trimmed.length < MIN_DESCRIPTION || trimmed.length > MAX_DESCRIPTION) return;

    setSaving(true);
    try {
      const response = await fetch("/api/me/description", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: trimmed }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update description");

      setCurrentUser((prev) => (prev ? { ...prev, description: trimmed } : prev));
      setIsEditingDescription(false);
    } catch (error) {
      console.error("Error saving client description:", error);
      alert(error instanceof Error ? error.message : "Failed to save description");
    } finally {
      setSaving(false);
    }
  };

  const isOwnProfile = currentUser?.id === params.id;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8 pt-24">
          <p className="text-gray-600 dark:text-gray-400">Loading client profile...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8 pt-24">
          <p className="text-red-600">Unable to load profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="mb-8">
          <Button variant="ghost" onClick={() => router.push("/dashboard")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">About {displayName}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {companyName ? `${companyName} · ` : ""}
            Client profile and project overview
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>About</CardTitle>
                    <CardDescription>
                      {isOwnProfile
                        ? "Tell builders about your company, priorities, and how you work."
                        : "Client profile information."}
                    </CardDescription>
                  </div>
                  {isOwnProfile && (
                    <Button variant="outline" size="sm" onClick={() => setIsEditingDescription((v) => !v)}>
                      {isEditingDescription ? (
                        <>
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </>
                      ) : (
                        <>
                          <Edit3 className="h-4 w-4 mr-2" />
                          Edit
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isEditingDescription ? (
                  <div className="space-y-4">
                    <Textarea
                      value={descriptionText}
                      onChange={(e) => setDescriptionText(e.target.value)}
                      className="min-h-[140px]"
                      placeholder="Share your company context, communication style, and what a successful collaboration looks like for your projects..."
                    />
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-gray-500">
                        Minimum {MIN_DESCRIPTION} characters, maximum {MAX_DESCRIPTION} characters
                      </p>
                      <p
                        className={`text-xs ${
                          descriptionText.trim().length < MIN_DESCRIPTION || descriptionText.trim().length > MAX_DESCRIPTION
                            ? "text-red-500"
                            : "text-green-600"
                        }`}
                      >
                        {descriptionText.trim().length}/{MAX_DESCRIPTION}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSaveDescription}
                        disabled={
                          saving ||
                          descriptionText.trim().length < MIN_DESCRIPTION ||
                          descriptionText.trim().length > MAX_DESCRIPTION
                        }
                        size="sm"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? "Saving..." : "Save"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDescriptionText(currentUser.description || "");
                          setIsEditingDescription(false);
                        }}
                        disabled={saving}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {currentUser.description ||
                      "Add your profile description so builders understand your project goals, timeline expectations, and collaboration style."}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>My Projects Overview</CardTitle>
                <CardDescription>Track current and completed mission activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-gray-500">Open</p>
                    <p className="text-xl font-semibold">{missionStats.open}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-gray-500">In Progress</p>
                    <p className="text-xl font-semibold">{missionStats.inProgress}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-gray-500">Completed</p>
                    <p className="text-xl font-semibold">{missionStats.completed}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-gray-500">Refunded</p>
                    <p className="text-xl font-semibold">{missionStats.refunded}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {missions.slice(0, 5).map((mission) => (
                    <div key={mission.id} className="flex items-center justify-between border rounded-md p-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{mission.title}</p>
                        <p className="text-xs text-gray-500">
                          {effectiveStatus(mission)} {mission.createdAt ? `· ${new Date(mission.createdAt).toLocaleDateString()}` : ""}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => router.push(`/missions/${mission.id}`)}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  ))}
                  {missions.length === 0 && (
                    <p className="text-sm text-gray-500">No projects yet. Create your first mission to get started.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Builder Reviews</CardTitle>
                <CardDescription>
                  {reviews.length > 0
                    ? `${reviews.length} review${reviews.length !== 1 ? "s" : ""} · ${averageRating.toFixed(1)}/5 average`
                    : "No reviews yet"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reviews.length > 0 ? (
                  <div className="space-y-4">
                    {reviews.slice(0, 8).map((review) => (
                      <div key={review.id} className="border-b pb-4 last:border-b-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              {renderStars(Number(review.rating || 0))}
                              <span className="text-sm text-gray-600">{Number(review.rating || 0).toFixed(1)}</span>
                            </div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                              {getReviewerName(review)}
                            </p>
                            {review.mission?.title && (
                              <p className="text-xs text-gray-500">Mission: {review.mission.title}</p>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {review.content && (
                          <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 whitespace-pre-wrap">
                            {review.content}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No reviews available yet for this client profile.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total Projects</span>
                  <span className="font-medium">{missions.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">In Progress</span>
                  <span className="font-medium">{missionStats.inProgress}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Reviews</span>
                  <span className="font-medium">{reviews.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Rating</span>
                  <span className="font-medium">
                    {reviews.length > 0 ? `${averageRating.toFixed(1)}/5` : "No rating"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
