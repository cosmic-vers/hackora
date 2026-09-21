import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Venues from "./pages/Venues";
import VenueDetail from "./pages/VenueDetail";
import NewBooking from "./pages/NewBooking";
import MyBookings from "./pages/MyBookings";
import Profile from "./pages/Profile";
import AdminBookings from "./pages/AdminBookings";
import AdminVenues from "./pages/AdminVenues";
import AdminUsers from "./pages/AdminUsers";
import AdminServices from "./pages/AdminServices";
import NotFound from "./pages/NotFound";
import AIRecommendation from "./pages/AIRecommendation";
import Payment from "./pages/Payment";
import Receipt from "./pages/Receipt";
import AdminBlocks from "./pages/AdminBlocks";

function AuthCallback() {
  const { loading } = useAuth();
  if (!loading) return <Navigate to="/app" replace />;
  return <div className="center-loading" style={{ minHeight: "100vh" }}><div className="spinner" /></div>;
}

// Charts pull in Recharts, which is large — load it only when analytics is opened.
const AdminAnalytics = lazy(() => import("./pages/AdminAnalytics"));

const REQUESTER_ROLES = ["CUSTOMER", "VENUE_OWNER"];

function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/app" replace />;
  return children;
}

/** Keeps the route table readable — one wrapper instead of nesting per route. */
function Private({ roles, children }) {
  return <ProtectedRoute roles={roles}>{children}</ProtectedRoute>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route
        path="/login"
        element={
          <GuestOnly>
            <Login />
          </GuestOnly>
        }
      />
      <Route
        path="/register"
        element={
          <GuestOnly>
            <Register />
          </GuestOnly>
        }
      />

      <Route path="/auth/callback" element={<AuthCallback />} />

      <Route
        path="/app"
        element={
          <Private>
            <Dashboard />
          </Private>
        }
      />
      <Route
        path="/app/venues"
        element={
          <Private>
            <Venues />
          </Private>
        }
      />
      <Route
        path="/app/venues/:id"
        element={
          <Private>
            <VenueDetail />
          </Private>
        }
      />
      <Route
        path="/app/profile"
        element={
          <Private>
            <Profile />
          </Private>
        }
      />
      <Route
        path="/app/book"
        element={
          <Private roles={REQUESTER_ROLES}>
            <NewBooking />
          </Private>
        }
      />
      <Route
        path="/app/ai-recommend"
        element={
          <Private roles={REQUESTER_ROLES}>
            <AIRecommendation />
          </Private>
        }
      />
      <Route
        path="/app/payment/:id"
        element={
          <Private roles={REQUESTER_ROLES}>
            <Payment />
          </Private>
        }
      />
      <Route
        path="/app/receipt/:id"
        element={
          <Private>
            <Receipt />
          </Private>
        }
      />
      <Route
        path="/app/my-bookings"
        element={
          <Private roles={REQUESTER_ROLES}>
            <MyBookings />
          </Private>
        }
      />

      <Route
        path="/app/admin/bookings"
        element={
          <Private roles={["ADMIN", "SUPER_ADMIN", "VENUE_OWNER"]}>
            <AdminBookings />
          </Private>
        }
      />
      <Route
        path="/app/admin/venues"
        element={
          <Private roles={["ADMIN", "SUPER_ADMIN", "VENUE_OWNER"]}>
            <AdminVenues />
          </Private>
        }
      />
      <Route
        path="/app/admin/users"
        element={
          <Private roles={["ADMIN", "SUPER_ADMIN"]}>
            <AdminUsers />
          </Private>
        }
      />
      <Route
        path="/app/admin/services"
        element={
          <Private roles={["ADMIN", "SUPER_ADMIN", "VENUE_OWNER"]}>
            <AdminServices />
          </Private>
        }
      />
      <Route
        path="/app/admin/blocks"
        element={
          <Private roles={["ADMIN", "SUPER_ADMIN"]}>
            <AdminBlocks />
          </Private>
        }
      />
      <Route
        path="/app/admin/analytics"
        element={
          <Private roles={["ADMIN", "SUPER_ADMIN"]}>
            <Suspense
              fallback={
                <div className="center-loading" style={{ minHeight: "60vh" }}>
                  <div className="spinner" />
                </div>
              }
            >
              <AdminAnalytics />
            </Suspense>
          </Private>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
