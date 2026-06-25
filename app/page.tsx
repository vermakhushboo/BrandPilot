import { ControlRoom } from "@/components/control-room/ControlRoom";
import { getControlRoomData } from "@/lib/data";
import {
  getPayPalCurrency,
  getPublicPayPalClientId,
  isPayPalConfigured,
} from "@/lib/paypal";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await getControlRoomData();
  const paypalEnabled = isPayPalConfigured();
  const paypalClientId = getPublicPayPalClientId();
  const paypalCurrency = getPayPalCurrency();

  return (
    <ControlRoom
      data={data}
      paypalEnabled={paypalEnabled}
      paypalClientId={paypalClientId}
      paypalCurrency={paypalCurrency}
    />
  );
}
