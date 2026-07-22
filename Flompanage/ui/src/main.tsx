import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "./context/AuthContext";
import { RefreshProvider } from "./context/RefreshContext";
import { NotificationProvider } from "./context/NotificationContext";
import { UpdateProvider } from "./context/UpdateContext";
import { AppVersionProvider } from "./context/AppVersionContext";
import { UserProfileProvider } from "./context/UserProfileContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { App } from "./App";
import "./index.css";
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <AppVersionProvider>
        <UpdateProvider>
        <AuthProvider>
          <NotificationProvider>
            <RefreshProvider>
              <UserProfileProvider>
                <App />
              </UserProfileProvider>
            </RefreshProvider>
          </NotificationProvider>
        </AuthProvider>
        </UpdateProvider>
      </AppVersionProvider>
    </ErrorBoundary>
  </StrictMode>,
);
