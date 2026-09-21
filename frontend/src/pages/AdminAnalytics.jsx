import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { CalendarCheck2,
  Banknote, RotateCcw, Clock, Building2, Users, ThumbsUp } from "lucide-react";
import Layout from "../components/Layout";
import EmptyState from "../components/EmptyState";
import { SkeletonStats } from "../components/Skeleton";
import client, { apiError } from "../api/client";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";

const STATUS_COLORS = {
  Pending: "#c9a227",
  Approved: "#3f7d58",
  Rejected: "#b3452d",
  Cancelled: "#8a92a0",
};

function StatCard({ label, value, suffix, icon: Icon, tone = "neutral" }) {
  const tones = {
    brass: { background: "var(--brass-soft)", color: "var(--brass-ink)" },
    ivy: { background: "var(--ivy-soft)", color: "var(--ivy-dim)" },
    neutral: { background: "var(--paper-dim)", color: "var(--ink)" },
  };
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <span className="stat-label">{label}</span>
        <div className="stat-card-icon" style={tones[tone]}>
          <Icon />
        </div>
      </div>
      <div className="stat-value">
        {value}
        {suffix && (
          <span style={{ fontSize: 14, color: "var(--slate)", fontFamily: "var(--font-body)" }}>
            {" "}
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

export default function AdminAnalytics() {
  const toast = useToast();
  const { theme } = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const dark = theme === "dark";
  const axis = dark ? "#8b98ad" : "#8a92a0";
  const grid = dark ? "#24324a" : "#e3ddcd";
  const tooltipStyle = {
    background: dark ? "#132034" : "#ffffff",
    border: `1px solid ${grid}`,
    borderRadius: 8,
    color: dark ? "#edf1f7" : "#12213a",
    fontSize: 13,
  };

  useEffect(() => {
    client
      .get("/analytics/overview")
      .then(({ data: payload }) => setData(payload))
      .catch((err) => toast.error(apiError(err, "Could not load analytics.").message))
      .finally(() => setLoading(false));
  }, [toast]);

  if (loading) {
    return (
      <Layout title="Analytics">
        <SkeletonStats count={5} />
        <div className="split-2">
          <div className="skeleton" style={{ height: 320, borderRadius: 10 }} />
          <div className="skeleton" style={{ height: 320, borderRadius: 10 }} />
        </div>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout title="Analytics">
        <EmptyState
          icon={CalendarCheck2}
          title="Analytics are unavailable"
          description="Reload the page to try again."
          actionLabel="Reload"
          onAction={() => window.location.reload()}
        />
      </Layout>
    );
  }

  const {
    totals,
    statusBreakdown,
    venueUtilization,
    categoryBreakdown,
    monthlyTrend,
    revenueTrend,
    peakHours,
    busiestDays,
  } = data;

  const hasBookings = totals.totalBookings > 0;

  return (
    <Layout title="Analytics" subtitle="How venue operations spaces are actually being used.">
      <div className="grid-stats">
        <StatCard label="Total requests" value={totals.totalBookings} icon={CalendarCheck2} />
        <StatCard label="Waiting on you" value={totals.pending} icon={Clock} tone="brass" />
        <StatCard
          label="Approval rate"
          value={`${totals.approvalRate}%`}
          icon={ThumbsUp}
          tone="ivy"
        />
        <StatCard
          label="Venues open"
          value={totals.activeVenues}
          suffix={`of ${totals.totalVenues}`}
          icon={Building2}
        />
        <StatCard label="People registered" value={totals.totalUsers} icon={Users} />
        <StatCard label="Collected revenue" value={`₹${Number(totals.collectedRevenue||0).toLocaleString("en-IN")}`} icon={Banknote} tone="ivy" />
        <StatCard label="Refunds" value={`₹${Number(totals.refunds||0).toLocaleString("en-IN")}`} icon={RotateCcw} tone="brass" />
      </div>

      {!hasBookings ? (
        <EmptyState
          icon={CalendarCheck2}
          title="No bookings to chart yet"
          description="Once requests start coming in, utilisation, timing, and trend charts appear here."
        />
      ) : (
        <div className="stack">
          <div className="split-2">
            <div className="card card-pad">
              <div className="section-title">Approved bookings by venue</div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={venueUtilization} layout="vertical" margin={{ left: 10, right: 16 }}>
                  <XAxis type="number" allowDecimals={false} stroke={axis} fontSize={12} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={130}
                    stroke={axis}
                    fontSize={12}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(201,162,39,0.12)" }}
                    contentStyle={tooltipStyle}
                    formatter={(value, name) => [value, name === "hours" ? "Hours booked" : "Bookings"]}
                  />
                  <Bar dataKey="bookings" fill="#c9a227" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card card-pad">
              <div className="section-title">Where requests end up</div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusBreakdown.filter((s) => s.value > 0)}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={92}
                    paddingAngle={3}
                  >
                    {statusBreakdown
                      .filter((s) => s.value > 0)
                      .map((entry) => (
                        <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
                      ))}
                  </Pie>
                  <Legend />
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card card-pad">
              <div className="section-title">Revenue & collection trend</div>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={revenueTrend || []}>
                  <CartesianGrid stroke={grid} vertical={false} />
                  <XAxis dataKey="month" stroke={axis} fontSize={12} />
                  <YAxis stroke={axis} fontSize={12} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Line type="monotone" dataKey="booked" name="Booked value" stroke="#c9a227" strokeWidth={3} />
                  <Line type="monotone" dataKey="collected" name="Collected" stroke="#3f7d58" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="split-even">
            <div className="card card-pad">
              <div className="section-title">Requests per month</div>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={monthlyTrend}>
                  <CartesianGrid stroke={grid} vertical={false} />
                  <XAxis dataKey="month" stroke={axis} fontSize={12} />
                  <YAxis allowDecimals={false} stroke={axis} fontSize={12} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="bookings"
                    name="Requested"
                    stroke="#c9a227"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="approved"
                    name="Approved"
                    stroke="#3f7d58"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="card card-pad">
              <div className="section-title">Busiest start times</div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={peakHours}>
                  <CartesianGrid stroke={grid} vertical={false} />
                  <XAxis dataKey="hour" stroke={axis} fontSize={12} />
                  <YAxis allowDecimals={false} stroke={axis} fontSize={12} />
                  <Tooltip cursor={{ fill: "rgba(63,125,88,0.12)" }} contentStyle={tooltipStyle} />
                  <Bar dataKey="bookings" fill="#3f7d58" radius={[4, 4, 0, 0]} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="split-2">
            <div className="card card-pad">
              <div className="section-title">Requests by category</div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={categoryBreakdown}>
                  <CartesianGrid stroke={grid} vertical={false} />
                  <XAxis dataKey="name" stroke={axis} fontSize={11} />
                  <YAxis allowDecimals={false} stroke={axis} fontSize={12} />
                  <Tooltip cursor={{ fill: "rgba(201,162,39,0.12)" }} contentStyle={tooltipStyle} />
                  <Bar dataKey="value" fill="#24406f" radius={[4, 4, 0, 0]} barSize={26} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card card-pad">
              <div className="section-title">Fullest days</div>
              {busiestDays.length === 0 ? (
                <p className="meta-line">No approved bookings yet.</p>
              ) : (
                busiestDays.map((day) => (
                  <div className="slot-row" key={day.date}>
                    <span>
                      {new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, {
                        weekday: "long",
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                    <span className="mono">
                      {day.bookings} {day.bookings === 1 ? "booking" : "bookings"}
                    </span>
                  </div>
                ))
              )}

              <div className="divider" />

              <div className="section-title">Hours booked per venue</div>
              {venueUtilization
                .filter((v) => v.hours > 0)
                .slice(0, 5)
                .map((v) => (
                  <div className="slot-row" key={v.name}>
                    <span style={{ minWidth: 0 }}>{v.name}</span>
                    <span className="mono">{v.hours} h</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
