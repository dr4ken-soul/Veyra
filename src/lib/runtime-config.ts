export function servConfigured() {
  return Boolean((process.env.SERV_REASONING_API_KEY || process.env.SERV_API_KEY) && process.env.SERV_MODEL);
}

export function kiteWorkerConfigured() {
  return Boolean(process.env.KITE_WORKER_URL && process.env.KITE_WORKER_TOKEN);
}

export function easyPostConfigured(mode: "test" | "live") {
  const key = mode === "test" ? process.env.EASYPOST_TEST_API_KEY : process.env.EASYPOST_PRODUCTION_API_KEY;
  return Boolean(key?.trim());
}

export function testModeReady(scenario?: string) {
  return servConfigured() && scenario === "shipment" && easyPostConfigured("test");
}

export function liveModeReady(scenario?: string) {
  if (!servConfigured()) return false;
  if (scenario === "shipment") return easyPostConfigured("live");
  return process.env.PASSPORT_LIVE_ENABLED === "true" &&
    process.env.PASSPORT_SESSION_ONLY_VERIFIED === "true" &&
    kiteWorkerConfigured();
}
