import { AppProvider } from "./provider/AppProvider";
import { AppRoutes } from "./routers/AppRoutes";

export default function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  );
}
