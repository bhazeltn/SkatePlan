import { Route, Routes } from "react-router-dom";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { SkaterProfilePage } from "@/pages/SkaterProfilePage";
import { PlaceholderPage } from "@/pages/PlaceholderPage";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";

const PROTECTED: { path: string; title: string }[] = [
  { path: "/skaters", title: "Skaters" },
  { path: "/programs", title: "Programs" },
  { path: "/sessions", title: "Sessions" },
  { path: "/competitions", title: "Competitions" },
  { path: "/gap-analysis", title: "Gap Analysis" },
];

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/skaters/:id"
        element={
          <ProtectedRoute>
            <SkaterProfilePage />
          </ProtectedRoute>
        }
      />
      {PROTECTED.map(({ path, title }) => (
        <Route
          key={path}
          path={path}
          element={
            <ProtectedRoute>
              <PlaceholderPage title={title} />
            </ProtectedRoute>
          }
        />
      ))}
    </Routes>
  );
}
