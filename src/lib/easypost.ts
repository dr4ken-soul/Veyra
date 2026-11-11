import "server-only";
import { HttpError } from "@/lib/errors";
import type { PaymentRecord, VeyraCase } from "@/lib/store";

type TrackerResult = {
  payload: Record<string, unknown>;
  sourceTimestamp: string | null;
  matchedSubject: string;
  payment: PaymentRecord;
};

function config(mode: "test" | "live") {
  const expectedMode = mode === "test" ? "test" : "production";
  const key = mode === "test" ? process.env.EASYPOST_TEST_API_KEY?.trim() : process.env.EASYPOST_PRODUCTION_API_KEY?.trim();
  if (!key) {
    const variable = mode === "test" ? "EASYPOST_TEST_API_KEY" : "EASYPOST_PRODUCTION_API_KEY";
    throw new HttpError(503, "EASYPOST_NOT_CONFIGURED", `Set ${variable} before using this shipment mode.`);
  }
  return { key, expectedMode };
}

function text(value: unknown, max = 300): string | null {
  return typeof value === "string" && value.length <= max ? value : null;
}

function timestamp(value: unknown): string | null {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) return null;
  return new Date(value).toISOString();
}

export async function retrieveEasyPostTracker(record: VeyraCase, mode: "test" | "live"): Promise<TrackerResult> {
  if (record.scenario !== "shipment") throw new HttpError(422, "PROVIDER_SCENARIO_UNSUPPORTED", "EasyPost only supports shipment tracking cases.");
  const { key, expectedMode } = config(mode);
  const controller = AbortSignal.timeout(30_000);
  let response: Response;
  try {
    response = await fetch("https://api.easypost.com/v2/trackers", {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(key + ":", "utf8").toString("base64"),
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({ tracker: { tracking_code: record.input.trackingReference, carrier: record.input.carrier } }),
      redirect: "error",
      cache: "no-store",
      signal: controller
    });
  } catch {
    throw new HttpError(503, "EASYPOST_UNAVAILABLE", "EasyPost could not be reached. Check the account activity before retrying.", true);
  }
  if (!response.ok) {
    // Do not expose provider bodies; EasyPost errors can include request/account details.
    throw new HttpError(response.status === 401 ? 503 : 502, "EASYPOST_REQUEST_FAILED", "EasyPost did not return a tracker. Check the configured key, carrier support and account status.", response.status >= 500);
  }

  let raw: unknown;
  try { raw = await response.json(); } catch { throw new HttpError(502, "EASYPOST_RESPONSE_INVALID", "EasyPost returned an unreadable tracker response."); }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new HttpError(502, "EASYPOST_RESPONSE_INVALID", "EasyPost returned an invalid tracker response.");
  const tracker = raw as Record<string, unknown>;
  const returnedCode = text(tracker.tracking_code, 240);
  const returnedCarrier = text(tracker.carrier, 120);
  const status = text(tracker.status, 80);
  const actualMode = text(tracker.mode, 40);
  const expectedCarrier = record.input.carrier.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const actualCarrier = (returnedCarrier || "").replace(/[^a-z0-9]/gi, "").toLowerCase();
  if (returnedCode !== record.input.trackingReference || !returnedCarrier || actualCarrier !== expectedCarrier || !status || actualMode !== expectedMode) {
    throw new HttpError(502, "EASYPOST_SUBJECT_MISMATCH", "The EasyPost response did not match the requested tracking code and carrier. Check EasyPost activity before taking further action.");
  }

  const details = Array.isArray(tracker.tracking_details) ? tracker.tracking_details.slice(0, 20) : [];
  const trackingDetails = details.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const detail = item as Record<string, unknown>;
    return {
      status: text(detail.status, 80),
      statusDetail: text(detail.status_detail, 100),
      message: text(detail.message, 300),
      datetime: timestamp(detail.datetime),
      source: text(detail.source, 120)
    };
  }).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const sourceTimestamp = timestamp(tracker.updated_at) || timestamp(trackingDetails[0]?.datetime);
  const payload: Record<string, unknown> = {
    provider: "EasyPost",
    trackerId: text(tracker.id, 120),
    mode: actualMode,
    carrier: returnedCarrier,
    trackingCode: returnedCode,
    status,
    statusDetail: text(tracker.status_detail, 100),
    createdAt: timestamp(tracker.created_at),
    updatedAt: timestamp(tracker.updated_at),
    estimatedDelivery: timestamp(tracker.est_delivery_date),
    trackingDetails
  };
  return {
    payload,
    sourceTimestamp,
    matchedSubject: `${returnedCarrier} ${returnedCode}`,
    payment: {
      state: mode === "test" ? "not_required" : "account_billed",
      amountMinor: null,
      asset: null,
      network: null,
      transactionRef: null,
      confirmationRef: null,
      confirmedAt: null
    }
  };
}

export const EASYPOST_LIMITATIONS = [
  "Carrier updates and timestamps are provided by EasyPost and the carrier; tracking codes can be reused and carrier coverage varies.",
  "A tracking status does not prove package contents, quantity, condition, delivery to the intended person, or the truth of the sender's claim.",
  "Live tracking uses the configured EasyPost production account. Review its pricing and activity; any provider billing is separate from Kite Passport.",
  "A person must review missing, stale, mismatched or conflicting carrier events."
];
