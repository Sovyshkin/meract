import { useEffect } from "react";

import { useLocation, useNavigate } from "react-router-dom";

import { useAuthStore } from "../../shared/stores/authStore";

function getCookie(name) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? match[2] : null;
}

export default function RequireAuth({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, login, onboardingRequired } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      const token = getCookie("access_token");
      if (token) {
        login({ token });
      } else {
        navigate("/login", { replace: true });
      }
    }
  }, [isAuthenticated, navigate, login]);

  useEffect(() => {
    if (isAuthenticated && onboardingRequired && location.pathname !== "/complete-profile") {
      navigate("/complete-profile", { replace: true });
    }
  }, [isAuthenticated, onboardingRequired, location.pathname, navigate]);

  if (!isAuthenticated && !getCookie("access_token")) {
    return null;
  }

  if (isAuthenticated && onboardingRequired && location.pathname !== "/complete-profile") {
    return null;
  }

  return children;
}
