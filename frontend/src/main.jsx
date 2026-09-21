import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { warmUpApi } from "./api/client.js";
import "./styles/tokens.css";
import "./styles/app.css";
import "./styles/landing.css";
import "./styles/auth.css";

// Ping the API the moment the page loads so a sleeping free-tier backend
// starts waking up while the person is still looking around, not the
// instant they click Confirm/Approve/Pay.
warmUpApi();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AuthProvider>
              <App />
            </AuthProvider>
          </BrowserRouter>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
