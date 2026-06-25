import type { ControlRoomData } from "@/lib/types";
import { ControlRoomClient } from "./ControlRoomClient";

interface ControlRoomProps {
  data: ControlRoomData;
  paypalEnabled: boolean;
  paypalClientId: string | null;
  paypalCurrency: string;
}

export function ControlRoom({
  data,
  paypalEnabled,
  paypalClientId,
  paypalCurrency,
}: ControlRoomProps) {
  return (
    <ControlRoomClient
      initialData={data}
      paypalEnabled={paypalEnabled}
      paypalClientId={paypalClientId}
      paypalCurrency={paypalCurrency}
    />
  );
}
