import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const Analytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");

  useEffect(() => {
    fetchAnalytics();
  }, [roleFilter, difficultyFilter]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const params = {};
      if (roleFilter) params.roleFilter = roleFilter;
      if (difficultyFilter) params.difficultyFilter = difficultyFilter;

      const response = await axios.get("/api/admin/analytics", { params });
      setAnalytics(response.data.analytics);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load analytics");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!analytics) {
    return <div className="text-center text-gray-600">No analytics data available</div>;
  }

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-slate-900 mb-8">Performance Analytics</h1>

        {/* Filters */}
        <div className="flex gap-4 mb-8">
          <input
            type="text"
            placeholder="Filter by role..."
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <button
            onClick={fetchAnalytics}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            Refresh
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <p className="text-gray-600 text-sm font-medium">Total Sessions</p>
            <p className="text-4xl font-bold text-blue-600 mt-2">{analytics.totalSessions || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <p className="text-gray-600 text-sm font-medium">Average Score</p>
            <p className="text-4xl font-bold text-green-600 mt-2">{(analytics.averageScore || 0).toFixed(1)}</p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <p className="text-gray-600 text-sm font-medium">Weak Areas</p>
            <p className="text-2xl font-bold text-amber-600 mt-2">{analytics.weakAreas?.length || 0}</p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Performance Trend */}
          {analytics.performanceTrend && analytics.performanceTrend.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Performance Trend</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.performanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="session" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="score" stroke="#3b82f6" dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Difficulty Breakdown */}
          {analytics.difficultyBreakdown && Object.keys(analytics.difficultyBreakdown).length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">By Difficulty</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={Object.entries(analytics.difficultyBreakdown).map(([diff, stats]) => ({
                  difficulty: diff,
                  ...stats,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="difficulty" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="attempts" fill="#3b82f6" name="Attempts" />
                  <Bar yAxisId="right" dataKey="average" fill="#10b981" name="Avg Score" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Role Performance & Weak/Strong Areas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Weak Areas */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Weak Areas</h2>
            <div className="space-y-4">
              {analytics.weakAreas && analytics.weakAreas.length > 0 ? (
                analytics.weakAreas.map((area, idx) => (
                  <div key={idx} className="flex justify-between items-center pb-3 border-b">
                    <div>
                      <p className="font-medium text-slate-900">{area.area}</p>
                      <p className="text-sm text-gray-600">{area.attempts} attempts</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600">{area.score.toFixed(1)}</p>
                      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500" style={{ width: `${area.score}%` }}></div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-600">No weak areas identified</p>
              )}
            </div>
          </div>

          {/* Strong Areas */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Strong Areas</h2>
            <div className="space-y-4">
              {analytics.strongAreas && analytics.strongAreas.length > 0 ? (
                analytics.strongAreas.map((area, idx) => (
                  <div key={idx} className="flex justify-between items-center pb-3 border-b">
                    <div>
                      <p className="font-medium text-slate-900">{area.area}</p>
                      <p className="text-sm text-gray-600">{area.attempts} attempts</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">{area.score.toFixed(1)}</p>
                      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500" style={{ width: `${area.score}%` }}></div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-600">No strong areas identified</p>
              )}
            </div>
          </div>
        </div>

        {/* Role Performance */}
        {analytics.rolePerformance && Object.keys(analytics.rolePerformance).length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mt-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Performance by Role</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Role</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Average Score</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Attempts</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {Object.entries(analytics.rolePerformance).map(([role, stats]) => (
                    <tr key={role} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm text-gray-900">{role}</td>
                      <td className="px-6 py-3 text-sm font-medium text-blue-600">{stats.average.toFixed(1)}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{stats.attempts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;
