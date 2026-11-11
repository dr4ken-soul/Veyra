import "server-only";
import { HttpError } from "@/lib/errors";
import type { Scenario } from "@/lib/domain";
import type { VeyraCase } from "@/lib/store";

const HOST = "api.sirenic.eu";
// The current Passport worker creates sessions with --assets USDC, so only
// accept the matching Base USDC requirement until EURC support is verified.
const ALLOWED_ASSETS = new Set(["0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"]);

export type SirenicQuote = {
  url: string;
  amount: string;
  asset: string;
  network: string;
  recipient: string | null;
};

function normalizedCountry(input: string) {
  const value = input.trim().toUpperCase();
  if (["GB", "UK", "UNITED KINGDOM", "GREAT BRITAIN"].includes(value)) return "GB";
  if (["FR", "FRANCE"].includes(value)) return "FR";
  throw new HttpError(422, "REGISTRY_COUNTRY_UNSUPPORTED", "Live registry checks currently support Great Britain and France.");
}

export function sirenicUrl(record: VeyraCase) {
  if (record.scenario === "shipment") throw new HttpError(422, "PROVIDER_SCENARIO_UNSUPPORTED", "Sirenic does not provide carrier tracking evidence.");
  const country = normalizedCountry(record.input.jurisdiction || "GB");
  const raw = record.input.registrationNumber.replace(/[\s.-]/g, "").toUpperCase();
  if (country === "GB" && !/^(\d{8}|[A-Z]{2}\d{6}|[A-Z]\d{7})$/.test(raw)) {
    throw new HttpError(422, "REGISTRY_ID_INVALID", "Enter a valid Companies House number (eight digits, SC/OC plus six digits, or one letter plus seven digits).");
  }
  if (country === "FR" && !/^\d{9}$/.test(raw)) {
    throw new HttpError(422, "REGISTRY_ID_INVALID", "Enter a nine-digit French SIREN number.");
  }
  const path = country === "FR" ? `/v1/entreprise/${raw}` : `/v1/eu/entreprise/GB/${raw}`;
  const url = new URL(path, `https://${HOST}`);
  if (url.hostname !== HOST || url.protocol !== "https:") throw new HttpError(500, "PROVIDER_URL_INVALID", "The approved provider URL could not be constructed.");
  return url;
}

function decodeHeader(value: string) {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(Buffer.from(normalized, "base64").toString("utf8")) as Record<string, unknown>;
  } catch {
    throw new HttpError(502, "PROVIDER_QUOTE_INVALID", "Sirenic returned an unreadable payment quote. No payment was attempted.");
  }
}

function amountFromAtomic(value: unknown, decimals: number) {
  if (typeof value !== "string" || !/^\d+$/.test(value) || value.length > 24) return null;
  const digits = value.padStart(decimals + 1, "0");
  const major = digits.slice(0, -decimals).replace(/^0+(?=\d)/, "");
  const minor = digits.slice(-decimals).replace(/0+$/, "");
  return minor ? `${major}.${minor}` : major;
}

function parseQuote(body: unknown, header: string | null, url: URL): SirenicQuote {
  if (!header) throw new HttpError(502, "PROVIDER_QUOTE_MISSING", "Sirenic did not include an x402 quote. No payment was attempted.");
  const decoded = decodeHeader(header);
  const bodyRecord = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const accepts = Array.isArray(decoded.accepts) ? decoded.accepts : [];
  const candidates = accepts.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"));
  const requirement = candidates.find((item) => {
    const network = String(item.network || "").toLowerCase();
    const asset = String(item.asset || "");
    return network === "eip155:8453" && ALLOWED_ASSETS.has(asset);
  });
  if (!requirement) throw new HttpError(502, "PROVIDER_QUOTE_UNSUPPORTED", "Sirenic's quote is not on the approved Base network or asset. No payment was attempted.");
  const decimals = 6;
  const atomic = requirement.maxAmountRequired ?? requirement.amount ?? requirement.max_amount_required;
  const amount = amountFromAtomic(atomic, decimals);
  const recipient = typeof requirement.payTo === "string" ? requirement.payTo : typeof requirement.pay_to === "string" ? requirement.pay_to : null;
  if (!amount || Number(amount) <= 0 || Number(amount) > 0.05 || !recipient || !/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
    throw new HttpError(502, "PROVIDER_QUOTE_OUT_OF_POLICY", "Sirenic's quote is missing a valid recipient or exceeds Veyra's $0.05 per-call ceiling. No payment was attempted.");
  }
  void bodyRecord;
  return { url: url.toString(), amount, asset: String(requirement.asset), network: "Base (eip155:8453)", recipient };
}

export async function preflightSirenic(record: VeyraCase): Promise<SirenicQuote> {
  const url = sirenicUrl(record);
  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(15_000)
    });
  } catch {
    throw new HttpError(503, "PROVIDER_UNAVAILABLE", "Sirenic could not be reached. No payment was attempted.", true);
  }
  if (response.status !== 402) {
    throw new HttpError(502, "PROVIDER_PREFLIGHT_UNEXPECTED", "Sirenic did not return the expected unpaid quote response. No payment was attempted.", true);
  }
  let body: unknown;
  try { body = await response.json(); } catch { body = null; }
  return parseQuote(body, response.headers.get("payment-required"), url);
}

export function validateSirenicResult(scenario: Scenario, expectedId: string, payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new HttpError(502, "PROVIDER_RESPONSE_INVALID", "Sirenic returned an invalid record. No decision was made.");
  }
  const result = payload as Record<string, unknown>;
  const returnedId = typeof result.id_national === "string" ? result.id_national.replace(/[\s.-]/g, "") :
    typeof result.siren === "string" ? result.siren.replace(/[\s.-]/g, "") : "";
  const expected = expectedId.replace(/[\s.-]/g, "").toUpperCase();
  if (!returnedId || returnedId.toUpperCase() !== expected) {
    throw new HttpError(502, "PROVIDER_SUBJECT_MISMATCH", "Sirenic's record did not match the requested registration number. No decision was made.");
  }
  const denomination = typeof result.denomination === "string" ? result.denomination : "";
  if (!denomination.trim()) throw new HttpError(502, "PROVIDER_RESPONSE_INCOMPLETE", "Sirenic returned no legal name for the requested record.");
  const status = typeof result.statut_detail === "string" ? result.statut_detail : typeof result.etat_administratif === "string" ? result.etat_administratif : typeof result.statut === "string" ? result.statut : "not provided";
  return { denomination, status };
}

export function sanitizeSirenicResult(record: VeyraCase, payload: unknown): Record<string, unknown> {
  const subject = validateSirenicResult(record.scenario, record.input.registrationNumber, payload);
  const raw = payload as Record<string, unknown>;
  const registrationNumber = typeof raw.id_national === "string" ? raw.id_national.replace(/[\s.-]/g, "").toUpperCase() :
    typeof raw.siren === "string" ? raw.siren.replace(/[\s.-]/g, "").toUpperCase() : record.input.registrationNumber.replace(/[\s.-]/g, "").toUpperCase();
  const country = normalizedCountry(record.input.jurisdiction || "GB");
  const sourceRecordUrl = country === "FR"
    ? `https://annuaire-entreprises.data.gouv.fr/entreprise/${registrationNumber}`
    : `https://find-and-update.company-information.service.gov.uk/company/${registrationNumber}`;
  return {
    provider: "Sirenic",
    jurisdiction: country,
    registrationNumber,
    legalName: subject.denomination.slice(0, 300),
    registryStatus: subject.status.slice(0, 120),
    sourceRecordUrl,
    retrievedAt: new Date().toISOString()
  };
}

export const SIRENIC_LIMITATIONS = [
  "The registry entry identifies a legal entity only; it does not verify bank-account ownership or authority over payment details.",
  "Registry coverage and freshness depend on the upstream register and the provider's published data window. Use the official register link for consequential decisions.",
  "Veyra does not approve, release, or pay invoices. A person must review the result."
];
