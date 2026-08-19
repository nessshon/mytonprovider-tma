import { bindSettingsButton, getStartParam } from "@/lib/telegram";
import { Alerts } from "@/screens/Alerts/Alerts";
import { BagExplorer } from "@/screens/BagExplorer/BagExplorer";
import { Filters } from "@/screens/Filters/Filters";
import { Home } from "@/screens/Home/Home";
import { ProviderBags } from "@/screens/ProviderBags/ProviderBags";
import { ProviderDetail } from "@/screens/ProviderDetail/ProviderDetail";
import { Trusted } from "@/screens/Trusted/Trusted";
import { useUi } from "@/stores/ui";
import { useEffect } from "react";
import { Navigate, Route, useNavigate, useParams } from "react-router-dom";
import { LayerStack } from "./layers/LayerStack";

let startParamHandled = false;

const PROVIDER_RE = /^(?:p_)?([0-9a-f]{64})$/i;
const BAG_RE = /^b_(.+)$/i;

function ProviderDetailRoute() {
  const { pubkey } = useParams();
  return <ProviderDetail key={pubkey} />;
}

export function AppRoutes() {
  const navigate = useNavigate();

  useEffect(
    () =>
      bindSettingsButton(() => {
        navigate("/");
        useUi.getState().setMenuOpen(true);
      }),
    [navigate],
  );

  useEffect(() => {
    if (startParamHandled) return;
    startParamHandled = true;
    const param = getStartParam();
    if (!param) return;
    const bag = BAG_RE.exec(param);
    if (bag) {
      navigate(`/bags?q=${encodeURIComponent(bag[1])}`);
      return;
    }
    const provider = PROVIDER_RE.exec(param);
    if (provider) {
      navigate(`/provider/${provider[1].toLowerCase()}`);
    }
  }, [navigate]);

  return (
    <LayerStack>
      <Route path="/" element={<Home />} />
      <Route path="/provider/:pubkey" element={<ProviderDetailRoute />} />
      <Route path="/provider/:pubkey/bags" element={<ProviderBags />} />
      <Route path="/bags" element={<BagExplorer />} />
      <Route path="/trusted" element={<Trusted />} />
      <Route path="/filters" element={<Filters />} />
      <Route path="/alerts" element={<Alerts />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </LayerStack>
  );
}
