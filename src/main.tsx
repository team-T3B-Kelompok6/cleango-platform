import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  RouterProvider,
  Navigate,
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  useRouterState,
} from "@tanstack/react-router";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Orders } from "./pages/Orders";
import { DemoProvider } from "./data/store";
import { AuthProvider, useAuth } from "./data/auth";
import { Login } from "./pages/Login";
import { Schedules } from "./pages/Schedules";
import { Services } from "./pages/Services";
import { Faqs } from "./pages/Faqs";
import { StaffPage, CustomersPage } from "./pages/People";
import { Reports } from "./pages/Reports";
import "./styles.css";
import "./admin.css";

function RootShell() {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const { signedIn } = useAuth();
  if (path === "/login") return <Outlet />;
  if (!signedIn) return <Navigate to="/login" />;
  return <Layout />;
}

const rootRoute = createRootRoute({
  component: RootShell,
  notFoundComponent: () => (
    <div className="empty-state">
      <h1>Halaman tidak ditemukan</h1>
      <a className="button" href="/">
        Kembali ke dashboard
      </a>
    </div>
  ),
});
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Dashboard,
});
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: Login,
});
const schedulesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/jadwal",
  component: Schedules,
});
const servicesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/layanan",
  component: Services,
});
const faqsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/faq",
  component: Faqs,
});
const staffRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/petugas",
  component: StaffPage,
});
const customersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/customer",
  component: CustomersPage,
});
const reportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/laporan",
  component: Reports,
});
export const ordersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/pesanan",
  validateSearch: (search: Record<string, unknown>): { order?: string } => ({
    order: typeof search.order === "string" ? search.order : undefined,
  }),
  component: Orders,
});
const router = createRouter({
  routeTree: rootRoute.addChildren([
    dashboardRoute,
    ordersRoute,
    loginRoute,
    schedulesRoute,
    servicesRoute,
    faqsRoute,
    staffRoute,
    customersRoute,
    reportsRoute,
  ]),
  defaultPreload: "intent",
  scrollRestoration: true,
});
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <DemoProvider>
        <RouterProvider router={router} />
      </DemoProvider>
    </AuthProvider>
  </StrictMode>,
);
