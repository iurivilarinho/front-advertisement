import { AdvertisementProvider } from "./provider/AdvertisementProvider";
import { AppProvider } from "./provider/AppProvider";
import { AppRoutes } from "./routers/AppRoutes";

export default function App() {
  return (
    <AdvertisementProvider>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </AdvertisementProvider>
  );
}
