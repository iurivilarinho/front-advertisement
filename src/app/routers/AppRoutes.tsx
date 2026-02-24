import { Route, Routes } from "react-router-dom";
// import { ProtectedRoute } from "./ProtectedRoute";
import { ROUTES } from "./routes";
import { AdvertisementForm } from "../../features/advertisement/AdvertisementForm";
import { MainLayout } from "../../components/layout/MainLayout";
import { NotFound } from "../../features/shared/NotFound";
import { PlayAdvertisement } from "../../features/advertisement/PlayAdvertisement";
import { PlayerPage } from "../../features/advertisement/PlayerPage";

export const AppRoutes = () => (
  <Routes>
    {/* <Route element={<AuthLayout />}>
      <Route path={ROUTES.login} element={<Login />} />
    </Route> */}

    {/* <Route element={<ProtectedRoute />}> */}
    <Route >
      <Route element={<MainLayout />}>
        <Route path={ROUTES.homepage} element={<PlayAdvertisement />} />
        <Route

          path={ROUTES.advertisementForm}
          element={<AdvertisementForm />} 
        />

        {/* <Route path={ROUTES.checklists} element={<Checklists />} />
        <Route path={ROUTES.dashboard} element={<Dashboard />} />
        <Route path={ROUTES.clients} element={<Clients />} />
        <Route path={ROUTES.clientForm} element={<ClientForm />} />
        <Route path={ROUTES.environments} element={<Environments />} />
        <Route path={ROUTES.environmentForm} element={<EnvironmentForm />} />
        <Route path={ROUTES.assets} element={<Assets />} />
        <Route path={ROUTES.users} element={<Users />} />
        <Route path={ROUTES.userForm} element={<UserForm />} />
        <Route path={ROUTES.roles} element={<Roles />} />
        <Route path={ROUTES.permissions} element={<Permissions />} /> */}
      </Route>
      <Route path={ROUTES.player} element={<PlayerPage />} />
    </Route>

    <Route path={ROUTES.notFound} element={<NotFound />} />
  </Routes>
);
