"use client";

import { useEffect, useState } from "react";
import { LatestRequest } from "@/lib/inFlight";

export function useLatestRequest() {
  const [request] = useState(() => new LatestRequest());
  useEffect(() => () => request.cancel(), [request]);
  return request;
}
