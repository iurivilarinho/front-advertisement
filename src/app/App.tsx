import { AdvertisementProvider } from "./provider/AdvertisementProvider";
import { AppProvider } from "./provider/AppProvider";
import { ThemeProvider } from "./provider/ThemeProviderContext";
import { AppRoutes } from "./routers/AppRoutes";

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <AdvertisementProvider>
        <AppProvider>
          <AppRoutes />
        </AppProvider>
      </AdvertisementProvider>
    </ThemeProvider>
  );
}
