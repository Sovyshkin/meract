import { useEffect, useState } from "react";

import { toast } from "react-toastify";

import { useAchievementStore } from "../../stores/achievementStore";
import { useAuthStore } from "../../stores/authStore";
import { achievementSocket } from "../../utils/achievementSocket";
import { getDisplayName, isEmailLike, getEmailNickname } from "../../utils/displayName";


export default function AchievementNotificationContainer() {
  console.log("🎬 AchievementNotificationContainer mounted");

  const { user, isAuthenticated } = useAuthStore();
  const { notifications, addNotification, removeNotification } =
    useAchievementStore();
  const [currentStreamId, setCurrentStreamId] = useState(null);

  console.log("User state:", { user, isAuthenticated, userId: user?.id });

  useEffect(() => {
    console.log("StreamId effect running");

    const updateStreamId = () => {
      const pathMatch = window.location.pathname.match(
        /^\/stream(?:-host)?\/(\d+)$/,
      );
      const streamId = pathMatch ? pathMatch[1] : null;
      console.log("StreamId detection:", {
        path: window.location.pathname,
        match: pathMatch,
        streamId,
      });
      setCurrentStreamId(streamId);
    };

    updateStreamId();

    const handleLocationChange = () => {
      updateStreamId();
    };

    window.addEventListener("popstate", handleLocationChange);

    const observer = new MutationObserver(updateStreamId);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener("popstate", handleLocationChange);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    console.log("Connection effect running:", {
      isAuthenticated,
      userId: user?.id,
      currentStreamId,
    });

    if (isAuthenticated && user?.id) {
      console.log("Conditions met, connecting to achievement socket:", {
        userId: user.id,
        streamId: currentStreamId,
        path: window.location.pathname,
      });

      achievementSocket.connect(user.id, currentStreamId);

      const unsubscribePersonal = achievementSocket.addListener(
        "personal",
        (data) => {
          console.log("Received personal achievement:", data);
          const achievement = data.achievement || data;
          const userName = isEmailLike(data.userName)
            ? getEmailNickname(data.userName)
            : data.userName || getDisplayName(data.user, "");

          addNotification({
            achievement,
            type: "personal",
            userName,
          });

          toast.success(
            `🏆 Achievement Unlocked!\n${achievement.icon || "🎯"} ${achievement.name || "Achievement"}\n${achievement.description || "Congratulations!"}`,
            {
              position: "top-right",
              autoClose: 5000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
            },
          );
        },
      );

      const unsubscribeGlobal = achievementSocket.addListener(
        "global",
        (data) => {
          console.log("Received global achievement:", data);
          const achievement = data.achievement || data;
          const userName = isEmailLike(data.userName)
            ? getEmailNickname(data.userName)
            : data.userName || getDisplayName(data.user, "");

          toast.info(
            `${achievement.icon || "🎯"} ${userName || "Someone"} earned: ${achievement.name || "Achievement"}!`,
            {
              position: "top-right",
              autoClose: 4000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
            },
          );
        },
      );

      return () => {
        unsubscribePersonal();
        unsubscribeGlobal();
        if (!currentStreamId) {
          achievementSocket.disconnect();
        }
      };
    }
  }, [isAuthenticated, user?.id, currentStreamId, addNotification]);

  return null;
}
