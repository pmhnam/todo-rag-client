import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProjectProvider } from "./contexts/ProjectContext";
import { ToastProvider } from "./components/Toast";
import { Layout } from "./components";
import { ProtectedRoute } from "./components/ProtectedRoute";
import {
  Login,
  Register,
  TodoBoard,
  AiChat,
  Profile,
} from "./pages";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProjectProvider>
          <ToastProvider>
            <Routes>
              {/* Auth pages (no layout) */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Main layout pages */}
              <Route element={<Layout />}>
                <Route path="/" element={<Navigate to="/board" replace />} />

                {/* Protected pages */}
                <Route
                  path="/board"
                  element={
                    <ProtectedRoute>
                      <TodoBoard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/chat"
                  element={
                    <ProtectedRoute>
                      <AiChat />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />
              </Route>
            </Routes>
          </ToastProvider>
        </ProjectProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
