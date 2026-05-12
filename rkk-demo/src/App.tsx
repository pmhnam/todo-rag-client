import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./components/Toast";
import { Layout } from "./components";
import { ProtectedRoute } from "./components/ProtectedRoute";
import {
  Overview,
  TrelloExample,
  ClickUpExample,
  JiraExample,
  InfiniteScrollExample,
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
        <ToastProvider>
          <Routes>
            {/* Auth pages (no layout) */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Main layout pages */}
            <Route element={<Layout />}>
              {/* Public demo pages */}
              <Route path="/" element={<Overview />} />
              <Route path="/trello" element={<TrelloExample />} />
              <Route path="/clickup" element={<ClickUpExample />} />
              <Route path="/tam" element={<JiraExample />} />
              <Route path="/infinite-scroll" element={<InfiniteScrollExample />} />

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
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
