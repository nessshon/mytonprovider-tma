import { bindSettingsButton, getStartParam } from "@/lib/telegram";
import { Alerts } from "@/screens/Alerts/Alerts";
import { Filters } from "@/screens/Filters/Filters";
import { Home } from "@/screens/Home/Home";
import { ProviderBags } from "@/screens/ProviderBags/ProviderBags";
import { ProviderDetail } from "@/screens/ProviderDetail/ProviderDetail";
import { Settings } from "@/screens/Settings/Settings";
import { useEffect } from "react";
import { Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";

let startParamHandled = false;

function ProviderDetailRoute() {
  const { pubkey } = useParams();
  return <ProviderDetail key={pubkey} />;
}

export function AppRoutes() {
  const navigate = useNavigate();

  useEffect(() => bindSettingsButton(() => navigate("/settings")), [navigate]);

  useEffect(() => {
    if (startParamHandled) return;
    startParamHandled = true;
    const param = getStartParam();
    if (param && /^[0-9a-f]{64}$/i.test(param)) {
      navigate(`/provider/${param.toLowerCase()}`, { replace: false });
    }
  }, [navigate]);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/provider/:pubkey" element={<ProviderDetailRoute />} />
      <Route path="/provider/:pubkey/bags" element={<ProviderBags />} />
      <Route path="/filters" element={<Filters />} />
      <Route path="/alerts" element={<Alerts />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
