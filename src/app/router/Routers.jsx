import { useEffect } from "react";

import {
  Navigate,
  createBrowserRouter,
  useSearchParams,
} from "react-router-dom";
// import RankFilters from"../../features/Auth//RankFilters";
import RankFilters from "../../pages/rank/RankFilters";
import TermOfUse from "../../features/Auth/registration/TermOfUse";
import StartPage from "../../features/Auth/startpage/StartPage"
import Login from "../../features/Auth/Login/Login";
import RequireAuth from "../../features/Auth/RequireAuth";
import ForgotPassword from "../../features/Auth/forgotPassword/ForgotPassword";
import SignUp from "../../features/Auth/registration/SignUp";
import AchievementsPage from "../../pages/achievements/AchievementsPage";
import ActDetailPage from "../../pages/actDetail/ActDetailPage";
import ActsPage from "../../pages/acts/ActsPage";
import CreateAct from "../../pages/createAct/CreateAct";
import GuildDetailPage from "../../pages/guilds/GuildDetailPage";
import GuildsPage from "../../pages/guilds/GuildsPage";
import RankPage from "../../pages/rank/RankPage";
import SceneControlIntro from "../../pages/sceneControl/intro/SceneControlIntro";
import SelectSequel from "../../pages/sceneControl/intro/SelectSequel/SelectSequel";
import SceneControlMusic from "../../pages/sceneControl/music/SceneControlMusic";
import SelectMusic from "../../pages/sceneControl/music/selectMusic/SelectMusic";
import SceneControlOutro from "../../pages/sceneControl/outro/SceneControlOutro";
import SceneControlTransition from "../../pages/sceneControl/transition/SceneControlTransition";
import StreamPage from "../../pages/stream/StreamPage";
import StreamHostPage from "../../pages/streamHost/StreamHostPage";
import { useAuthStore } from "../../shared/stores/authStore";
import ActsFilters from "../../pages/acts/ActsFilters";
import RankDetails from "../../pages/rank/RankDetailt";
import GuildsFilters from "../../pages/guilds/GuildsFilter";
import GuildAbout from "../../pages/guilds/components/GuildAbout";
import GuildSettings from "../../pages/guilds/components/GuildSettings";
import RankAchive from "../../pages/rank/RankAchive";
import Notifications from "../../pages/notifications/Notifications";
import ChatPage from "../../pages/chats/ChatPage";
import ChatCreate from "../../pages/chats/ChatCreate";
import ChatSingle from "../../pages/chats/ChatSingle";
import NotFoundPage from "../../pages/NotFoundPage";
import TechnicalWorkPage from '../../pages/TechnicalWorkPage';
import PayPage from "../../pages/pay/PayPage";
import PayDetail from "../../pages/pay/PayDetail";
import PayStore from "../../pages/pay/PayStore";
import PayTransfer from "../../pages/pay/PayTransfer";
import PayTransferDetail from "../../pages/pay/PayTransferDetail";
import SettingsPage from "../../pages/settings/SettingsPage";
import PersonalData from "../../pages/settings/PersonalData";
import NotificationsPage from "../../pages/settings/NotificationsPage";
import LocalTime from "../../pages/settings/LocalTime";
import LanguageSelection from "../../pages/settings/LanguagePage";
import LocationPage from "../../pages/settings/LocationPage";
import LocationDetailPage from "../../pages/settings/LocaltionDetail";
import SecurityPage from "../../pages/settings/SecurityPage";
import TechnicalSupport from "../../pages/TechnicalSupport/TechnicalSupport";
import SupportPage from "../../pages/support/SupportPage";
import ActDetail from "../../pages/acts/ActsDetail";
import TeamDetail from "../../pages/createAct/TeamDetail";
import MyActsPage from "../../pages/acts/MyActs";
import CompanionProfile from "../../pages/chats/CompanionProfile";
import MyAchieve from "../../pages/myAchieve/MyAchieve";
import ChatMulti from "../../pages/chats/ChatMulti";
import AddMember from "../../pages/createAct/AddMember";
const HomeRedirect = () => {
  const [searchParams] = useSearchParams();
  const { isAuthenticated, login } = useAuthStore();

  useEffect(() => {
    const userParam = searchParams.get("user");

    if (userParam) {
      try {
        const userData = JSON.parse(decodeURIComponent(userParam));
        console.log("Google OAuth user data received:", userData);

        login(userData);

        window.history.replaceState({}, document.title, "/acts");
      } catch (error) {
        console.error("Error parsing user data from Google OAuth:", error);
      }
    }
  }, [searchParams, login]);

  return <Navigate to={isAuthenticated ? "/acts" : "/"} replace />;
};
export const technicalRouter = createBrowserRouter([
  {
    path: "*",
    element: <TechnicalWorkPage />,
  },
]);
export const router = createBrowserRouter([
  {
    path: "/",
    element: <StartPage/>,
  },
  {
    path: "/acts",
    element: (
      <RequireAuth>
        <ActsPage />
      </RequireAuth>
    ),
  },
  {
    path: "/acts/:id",
    element: (
      <RequireAuth>
        <ActDetail />
      </RequireAuth>
    ),
  },
  {
    path: "/guilds",
    element: (
      <RequireAuth>
        <GuildsPage />
      </RequireAuth>
    ),
  },
  {
    path: "/guilds/:id",
    element: (
      <RequireAuth>
        <GuildDetailPage />
      </RequireAuth>
    ),
  },
  {
    path: "/achievements",
    element: (
      <RequireAuth>
        <AchievementsPage />
      </RequireAuth>
    ),
  },
  {
    path: "/rank",
    element: (
      <RequireAuth>
        <RankPage />
      </RequireAuth>
    ),
  },
  {
    path: "/rank/:id",
    element: (
      <RequireAuth>
        <RankDetails />
      </RequireAuth>

    ),
  },
  {
    path: "rank-achive/:id",
    element: <RankAchive />,
  },
  {
    path: "/scene-control-intro",
    element: <SceneControlIntro />,
  },
  {
    path: "/scene-control-transition",
    element: <SceneControlTransition />,
  },
  {
    path: "/scene-control-music",
    element: <SceneControlMusic />,
  },
  {
    path: "/scene-control-music-select",
    element: <SelectMusic />,
  },
  {
    path: "/scene-control-sequel-select",
    element: <SelectSequel />,
  },
  {
    path: "/scene-control-outro",
    element: <SceneControlOutro />,
  },
  {
    path: "/create-act",
    element: <CreateAct />,
  },
  {
    path: "/stream-host/:id",
    element: (
      <RequireAuth>
        <ActDetailPage />
      </RequireAuth>
    ),
  },
  {
    path: "/stream/:id",
    element: <StreamPage />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/registration",
    element: <SignUp />,
  },
  {
    path: "/forgot-password",
    element: <ForgotPassword />,
  },
  {
    path: "/termofuse",
    element: <TermOfUse />,
  },
  {
    path: "filters",
    element: <ActsFilters />,
  },
  {
    path: "rank-filters",
    element: <RankFilters />,
  },
  {
    path: "test/:id",
    element: <StreamHostPage />,
  },
   {
    path: "guilds-filters",
    element: <GuildsFilters />,
  },
   {
    path: "guild-about/:id",
    element: <GuildAbout />,
  },
   {
    path: "guild-settings/:id",
    element: <GuildSettings />,
  },
  {
    path: "notifications",
    element: <Notifications />,
  },
   {
    path: "chats",
    element: <ChatPage />,
  },
  {
    path: "chat-create",
    element: <ChatCreate />,
  },
  {
    path: "chat/:id/:userId",
    element: <ChatSingle />,
  },
  {
    path: "group/:id/",
    element: <ChatMulti />,
  },
  
  {
    path: "wallet",
    element: <PayPage />,
  },
  {
    path: "wallet/:id",
    element: <PayDetail />,
  },
  {
    path: "wallet/shop",
    element: <PayStore />,
  },
   {
    path: "wallet/transfer",
    element: <PayTransfer />,
  },
   {
    path: "wallet/transfer/:id",
    element: <PayTransferDetail />,
  },
   {
    path: "settings",
    element: <SettingsPage />,
  },
  {
    path: "settings/profile",
    element: <PersonalData />,
  },
  {
    path: "settings/notifications",
    element: <NotificationsPage />,
  },
  {
    path: "settings/time/:name",
    element: <LocalTime />,
  },
  {
    path: "settings/lang",
    element: <LanguageSelection />,
  },
  {
    path: "settings/location",
    element: <LocationPage />,
  },
  {
    path: "settings/location/:name",
    element: <LocationDetailPage />,
  },
  {
    path: "settings/security",
    element: <SecurityPage />,
  },
  {
    path: "support",
    element: <SupportPage />,
  },
  {
    path: "team",
    element: <TeamDetail />,
  },
  {
    path: "my-acts",
    element: <MyActsPage />,
  },

{
    path: "/profile/:id/:userId",
    element: (
        <CompanionProfile />
    ),
  },

  {
    path: "/my-achievements",
    element: (
        <MyAchieve />
    ),
  },  
  {
    path: "/add-member/:type",
    element: (
        <AddMember />
    ),
  },  


  {
    path: "*",
    element: <NotFoundPage />,
  },
]);
