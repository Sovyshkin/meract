import { useEffect } from "react";

import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { useAuthStore } from "../../shared/stores/authStore";

function getCookie(name) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? match[2] : null;
}

export default function RequireAuth({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, login, onboardingRequired } = useAuthStore();

  useEffect(() => {
    const userParam = searchParams.get("user");
    const isOnboarding = searchParams.get("onboarding") === "1";

    // 1. Если параметры OAuth пришли прямо на эту страницу
    if (userParam) {
      try {
        const userData = JSON.parse(decodeURIComponent(userParam));
        const accessToken = getCookie("access_token");

        login({
          user: userData,
          token: accessToken || userData?.token || userData?.accessToken,
          onboardingRequired: isOnboarding,
        });

        // Очищаем строку, чтобы параметры не висели в URL
        window.history.replaceState({}, document.title, location.pathname);

        if (isOnboarding) {
          navigate("/complete-profile", { replace: true });
        }
        return;
      } catch (e) {
        console.error("OAuth parse error in RequireAuth:", e);
      }
    }

    // 2. Стандартная проверка авторизации
    if (!isAuthenticated) {
      const token = getCookie("access_token");
      if (token) {
        login({ token });
      } else {
        navigate("/login", { replace: true });
      }
    }
  }, [isAuthenticated, searchParams, navigate, login, location.pathname]);

  // 3. Редирект на онбординг, если флаг активен
  useEffect(() => {
    if (isAuthenticated && onboardingRequired && location.pathname !== "/complete-profile") {
      navigate("/complete-profile", { replace: true });
    }
  }, [isAuthenticated, onboardingRequired, location.pathname, navigate]);

  if (!isAuthenticated && !getCookie("access_token") && !searchParams.get("user")) {
    return null;
  }

  if (isAuthenticated && onboardingRequired && location.pathname !== "/complete-profile") {
    return null;
  }

  return children;
}
