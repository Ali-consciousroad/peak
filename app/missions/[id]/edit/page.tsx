"use client";

import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  calculateTimeframeDdMmYyyy,
  endDateDdMmYyyyFromStartAndTimeframe,
  formatMissionDateInputFromApi,
} from "@/lib/mission-dates";

interface Mission {
  id: string;
  title: string;
  description: string;
  dailyRate: number;
  timeframe: number;
  status: string;
  contract?: { isActive?: boolean } | null;
}

export default function EditMissionPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { userId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    dailyRate: "",
    timeframe: "",
    startDate: "",
    endDate: "",
  });
  const [missionStatus, setMissionStatus] = useState<string>("OPEN");
  const [canEditMissionDates, setCanEditMissionDates] = useState(false);

  useEffect(() => {
    if (!userId) {
      router.push("/sign-in");
      return;
    }

    // Check user role and redirect freelancers
    const checkUserRole = async () => {
      try {
        const response = await fetch('/api/me');
        if (response.ok) {
          const userData = await response.json();
          if (userData.role === 'freelance') {
            console.log('Freelancer trying to access mission edit - redirecting to dashboard');
            router.replace('/dashboard');
            return;
          }
        }
      } catch (error) {
        console.error('Error checking user role:', error);
      }
    };

    const fetchMission = async () => {
      try {
        const response = await fetch(`/api/missions/${params.id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch mission");
        }
        const data = await response.json();
        setMissionStatus(data.status || "OPEN");
        setCanEditMissionDates(
          data.status === "OPEN" && !data.contract?.isActive,
        );
        setFormData({
          title: data.title,
          description: data.description,
          dailyRate: data.dailyRate.toString(),
          timeframe: data.timeframe.toString(),
          startDate: formatMissionDateInputFromApi(data.startDate),
          endDate: formatMissionDateInputFromApi(data.endDate),
        });
      } catch (error) {
        console.error("Error fetching mission:", error);
      }
    };

    checkUserRole();
    fetchMission();
  }, [userId, router, params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Remove leading zeros and convert to numbers
      const dailyRate = parseInt(formData.dailyRate.replace(/^0+/, ''), 10);
      const timeframe = parseInt(formData.timeframe.replace(/^0+/, ''), 10);

      const payload: Record<string, unknown> = {
        title: formData.title,
        description: formData.description,
        dailyRate,
        timeframe,
        status: missionStatus,
      };
      if (canEditMissionDates) {
        payload.startDate = formData.startDate;
        payload.endDate = formData.endDate;
      }

      const response = await fetch(`/api/missions/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update mission");
      }

      router.push(`/missions/${params.id}`);
    } catch (error) {
      console.error("Error updating mission:", error);
      alert(error instanceof Error ? error.message : "Failed to update mission. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    // For number inputs, remove leading zeros
    if (name === 'dailyRate' || name === 'timeframe') {
      const numValue = value.replace(/^0+/, '') || '0';
      if (name === 'timeframe' && canEditMissionDates) {
        const tf = parseInt(numValue, 10) || 0;
        setFormData((prev) => {
          if (!prev.startDate) return { ...prev, timeframe: numValue };
          try {
            const newEnd = endDateDdMmYyyyFromStartAndTimeframe(
              prev.startDate,
              tf,
            );
            return { ...prev, timeframe: numValue, endDate: newEnd };
          } catch {
            return { ...prev, timeframe: numValue };
          }
        });
        return;
      }
      setFormData(prev => ({ ...prev, [name]: numValue }));
    } else if (name === 'startDate' && canEditMissionDates) {
      setFormData((prev) => {
        let endDate = prev.endDate;
        const tf = parseInt(prev.timeframe.replace(/^0+/, ''), 10) || 0;
        if (value && tf) {
          try {
            endDate = endDateDdMmYyyyFromStartAndTimeframe(value, tf);
          } catch {
            /* keep */
          }
        }
        return { ...prev, startDate: value, endDate };
      });
    } else if (name === 'endDate' && canEditMissionDates) {
      setFormData((prev) => {
        const tf = calculateTimeframeDdMmYyyy(prev.startDate, value);
        return {
          ...prev,
          endDate: value,
          ...(tf ? { timeframe: tf } : {}),
        };
      });
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  if (!userId) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-24">
      <div className="glass-card max-w-2xl mx-auto p-8 shadow-lg border border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">Edit Mission</CardTitle>
          <CardDescription className="text-gray-500 dark:text-gray-300">
            Update the details of your mission
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-gray-800 dark:text-gray-200">Title</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Enter mission title"
                required
                className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:focus-visible:ring-blue-600"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-gray-800 dark:text-gray-200">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe your mission in detail"
                required
                rows={5}
                maxLength={200}
                className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:focus-visible:ring-blue-600"
              />
              <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
                {formData.description.length}/200 characters
              </div>
            </div>

              <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dailyRate" className="text-gray-800 dark:text-gray-200">Daily Rate (€)</Label>
                <Input
                  id="dailyRate"
                  name="dailyRate"
                  type="number"
                  value={formData.dailyRate}
                  onChange={handleChange}
                  placeholder="Enter daily rate"
                  required
                  min="0"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:focus-visible:ring-blue-600"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeframe" className="text-gray-800 dark:text-gray-200">Timeframe (days)</Label>
                <Input
                  id="timeframe"
                  name="timeframe"
                  type="number"
                  value={formData.timeframe}
                  onChange={handleChange}
                  placeholder="Enter timeframe"
                  required
                  min="1"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:focus-visible:ring-blue-600"
                />
              </div>
            </div>

            {canEditMissionDates && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate" className="text-gray-800 dark:text-gray-200">
                    Start date (dd/mm/yyyy)
                  </Label>
                  <Input
                    id="startDate"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    placeholder="dd/mm/yyyy"
                    required
                    className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:focus-visible:ring-blue-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate" className="text-gray-800 dark:text-gray-200">
                    End date (dd/mm/yyyy)
                  </Label>
                  <Input
                    id="endDate"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    placeholder="dd/mm/yyyy"
                    required
                    className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:focus-visible:ring-blue-600"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 sm:col-span-2">
                  Dates can be changed while the mission is open and not yet assigned to a builder.
                </p>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-between mt-6">
            <Button
              type="button"
              variant="outline"
              className="border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:focus-visible:ring-blue-600"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:focus-visible:ring-blue-600 border border-blue-700 dark:border-blue-500">
              {loading ? "Updating..." : "Update Mission"}
            </Button>
          </CardFooter>
        </form>
      </div>
    </div>
  );
} 