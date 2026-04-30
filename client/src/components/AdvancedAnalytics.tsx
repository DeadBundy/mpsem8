import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { AlertCircle, Download, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

const EMOTION_COLORS: Record<string, string> = {
  happy: "#fbbf24",
  sad: "#3b82f6",
  angry: "#ef4444",
  fearful: "#8b5cf6",
  neutral: "#6b7280",
  disgusted: "#84cc16",
  surprised: "#f59e0b",
};

interface AnalyticsData {
  totalSessions: number;
  averageMood: number;
  moodTrend: "improving" | "declining" | "stable";
  dominantEmotions: { emotion: string; count: number }[];
  sentimentAnalysis: {
    averageSentiment: number;
    positiveMessages: number;
    negativeMessages: number;
  };
  weeklyTrend: { day: string; mood: number }[];
  predictedMood: string;
  insights: string[];
  riskFactors: string[];
}

export function AdvancedAnalytics() {
  const { sessionId } = useParams();

  const {
    data: analyticsData,
    isLoading,
    error,
  } = useQuery<AnalyticsData>({
    queryKey: [`/api/analytics/${sessionId}`],
  });

  const { mutate: downloadReport, isPending } = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/report/pdf/${sessionId}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mood-report-${sessionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoaderCircle className="animate-spin mr-2" />
        Loading analytics...
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load analytics</AlertDescription>
      </Alert>
    );
  }

  if (!analyticsData) return null;

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">📊 Advanced Analytics</h1>
        <Button
          onClick={() => downloadReport()}
          disabled={isPending}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          {isPending ? "Downloading..." : "Download Report (PDF)"}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Average Mood
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData.averageMood.toFixed(2)}/4.0
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Mood Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {analyticsData.moodTrend === "improving" && "📈"}
              {analyticsData.moodTrend === "declining" && "📉"}
              {analyticsData.moodTrend === "stable" && "➡️"}
              {" "}{analyticsData.moodTrend}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Predicted Mood
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {analyticsData.predictedMood}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analyticsData.totalSessions}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Factors Alert */}
      {analyticsData.riskFactors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Risk Factors Detected:</strong>
            <ul className="list-disc ml-4 mt-2">
              {analyticsData.riskFactors.map((factor, i) => (
                <li key={i}>{factor}</li>
              ))}
            </ul>
            <p className="mt-2 text-sm">
              If you're in crisis, please reach out to a mental health professional.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Emotion Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Emotion Distribution</CardTitle>
            <CardDescription>
              Breakdown of emotions across sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData.dominantEmotions}
                  dataKey="count"
                  nameKey="emotion"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {analyticsData.dominantEmotions.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={EMOTION_COLORS[entry.emotion] || "#999"}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Weekly Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Mood Trend</CardTitle>
            <CardDescription>Average mood over the past week</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData.weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="mood"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Sentiment Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Sentiment Analysis</CardTitle>
          <CardDescription>Emotional tone of your messages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded">
              <div className="text-2xl font-bold text-blue-600">
                {analyticsData.sentimentAnalysis.averageSentiment.toFixed(2)}
              </div>
              <p className="text-sm text-gray-600">Avg Sentiment</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded">
              <div className="text-2xl font-bold text-green-600">
                {analyticsData.sentimentAnalysis.positiveMessages}
              </div>
              <p className="text-sm text-gray-600">Positive Messages</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded">
              <div className="text-2xl font-bold text-red-600">
                {analyticsData.sentimentAnalysis.negativeMessages}
              </div>
              <p className="text-sm text-gray-600">Negative Messages</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle>💡 Key Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {analyticsData.insights.map((insight, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-lg">•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
