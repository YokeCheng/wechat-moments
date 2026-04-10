import type { RouteObject } from "react-router-dom";
import NotFound from "../pages/NotFound";
import Home from "../pages/home/page";
import PromptsPage from "../pages/prompts/page";
import WriterPage from "../pages/writer/page";
import LayoutPage from "../pages/layout/page";
import ChannelsPage from "../pages/channels/page";
import VipPage from "../pages/vip/page";
import TutorialPage from "../pages/tutorial/page";
import ContactPage from "../pages/contact/page";
import TopBar from "../components/feature/TopBar";

const Layout = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-col h-screen overflow-hidden bg-[#F7F8FA]">
    <TopBar />
    <div className="flex flex-1 pt-[52px] overflow-hidden min-h-0">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </div>
    </div>
  </div>
);

const routes: RouteObject[] = [
  { path: "/", element: <Layout><Home /></Layout> },
  { path: "/prompts", element: <Layout><PromptsPage /></Layout> },
  { path: "/writer", element: <Layout><WriterPage /></Layout> },
  { path: "/layout", element: <Layout><LayoutPage /></Layout> },
  { path: "/channels", element: <Layout><ChannelsPage /></Layout> },
  { path: "/vip", element: <Layout><VipPage /></Layout> },
  { path: "/tutorial", element: <Layout><TutorialPage /></Layout> },
  { path: "/contact", element: <Layout><ContactPage /></Layout> },
  { path: "*", element: <NotFound /> },
];

export default routes;
