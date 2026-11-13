"use client";

import { useEffect, useState } from "react";
import { base } from "viem/chains";

const SIRENIC_HOST = "api.sirenic.eu";
const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const MAX_AMOUNT_ATOMIC = 5_000;
const BASE_CHAIN_ID = "0x2105";

type InjectedWallet = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
};

declare global {
  interface Window {
    ethereum?: InjectedWallet;
  }
}

type LiveQuote = {
  url: string;
  registrationNumber: string;
  requirement: {
    scheme: string;
    network: string;
    amount: string;
    asset: string;
    payTo: string;
    maxTimeoutSeconds: number;
    extra?: Record<string, unknown> | null;
  };
  expiresAt: number;
};
type LiveResult = {
  registrationNumber: string;
  legalName: string;
  status: string;
  sourceUrl: string;
  retrievedAt: string;
  transactionHash: string | null;
  signingKeyId: string;
  verificationId: string | null;
};

type SirenicKeyEntry = {
  kid: string;
  alg: string;
  public_key: string;
  valid_from?: string;
  valid_until?: string | null;
};

type SirenicKeyDocument = {
  kid?: string;
  public_key?: string;
  keys?: SirenicKeyEntry[];
};

function normalizeNumber(value: string) {
  return value.replace(/[\s.-]/g, "").toUpperCase();
}

function validateNumber(value: string) {
  const normalized = normalizeNumber(value);
  if (!/^\d{9}$/.test(normalized)) return { normalized, error: "Enter a nine-digit French SIREN." };
  return { normalized, error: null };
}

function companyUrl(registrationNumber: string) {
  return new URL(`/v1/entreprise/${registrationNumber}`, `https://${SIRENIC_HOST}`).toString();
}

function formatUsdc(atomic: string) {
  const digits = atomic.replace(/^0+(?=\d)/, "").padStart(7, "0");
  const whole = digits.slice(0, -6).replace(/^0+(?=\d)/, "");
  const fraction = digits.slice(-6).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

function shortAddress(value: string) {
  return value.slice(0, 6) + "…" + value.slice(-4);
}

function transactionHashFrom(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const possible = [record.transaction, record.transactionHash, record.txHash, record.tx_hash, record.hash];
  for (const candidate of possible) {
    if (typeof candidate === "string" && /^0x[a-fA-F0-9]{64}$/.test(candidate)) return candidate;
  }
  for (const child of Object.values(record)) {
    if (child && typeof child === "object") {
      const nested = transactionHashFrom(child);
      if (nested) return nested;
    }
  }
  return null;
}

function registryUrl(registrationNumber: string) {
  return `https://annuaire-entreprises.data.gouv.fr/entreprise/${registrationNumber}`;
}

function decodeBase64(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function encodeBase64(value: Uint8Array) {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function verifySirenicResponse(response: Response, body: ArrayBuffer) {
  const keyId = response.headers.get("x-sirenic-key-id");
  const timestamp = response.headers.get("x-sirenic-timestamp");
  const signature = response.headers.get("x-sirenic-signature");
  if (!keyId || !timestamp || !signature) throw new Error("Sirenic did not provide all response-signature headers. The paid result will not be trusted.");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(timestamp)) {
    throw new Error("Sirenic returned a malformed signature timestamp. The paid result will not be trusted.");
  }
  const signedAt = Date.parse(timestamp);
  if (!Number.isFinite(signedAt) || Math.abs(Date.now() - signedAt) > 15 * 60 * 1000) {
    throw new Error("Sirenic’s response signature is outside the accepted time window. Check wallet activity before retrying.");
  }

  const keyResponse = await fetch(`https://${SIRENIC_HOST}/.well-known/sirenic-signing-key`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
    credentials: "omit",
    redirect: "error",
    signal: AbortSignal.timeout(10_000)
  });
  if (!keyResponse.ok) throw new Error("Could not retrieve Sirenic’s public signing keys. The paid result will not be trusted.");
  const keyDocument = await keyResponse.json() as SirenicKeyDocument;
  const signedDay = timestamp.slice(0, 10);
  let publicKeyBase64: string | undefined;
  if (Array.isArray(keyDocument.keys)) {
    const entry = keyDocument.keys.find((item) => item.kid === keyId);
    if (!entry || entry.alg !== "Ed25519" || !entry.valid_from) {
      throw new Error("The response signing key is not published by Sirenic. The paid result will not be trusted.");
    }
    if (signedDay < entry.valid_from || (entry.valid_until && signedDay > entry.valid_until)) {
      throw new Error("The response signing key was not valid on the signed date. The paid result will not be trusted.");
    }
    publicKeyBase64 = entry.public_key;
  } else if (keyDocument.kid === keyId && keyDocument.public_key) {
    publicKeyBase64 = keyDocument.public_key;
  }
  if (!publicKeyBase64) throw new Error("The response signing key ID is unknown. The paid result will not be trusted.");

  const digest = await crypto.subtle.digest("SHA-256", body);
  const digestBase64 = encodeBase64(new Uint8Array(digest));
  const signedMessage = new TextEncoder().encode(`sirenic-v1:${keyId}:${timestamp}:${digestBase64}`);
  let publicKey: CryptoKey;
  let signatureBytes: ArrayBuffer;
  try {
    publicKey = await crypto.subtle.importKey("spki", decodeBase64(publicKeyBase64).buffer as ArrayBuffer, { name: "Ed25519" }, false, ["verify"]);
    signatureBytes = decodeBase64(signature).buffer as ArrayBuffer;
  } catch {
    throw new Error("This browser could not load Sirenic’s Ed25519 signing key. The paid result will not be trusted.");
  }
  const valid = await crypto.subtle.verify({ name: "Ed25519" }, publicKey, signatureBytes, signedMessage);
  if (!valid) throw new Error("Sirenic’s response signature is invalid. Check wallet activity before retrying.");
  const candidateReceiptId = response.headers.get("x-sirenic-verification-id");
  let verificationId: string | null = null;
  if (candidateReceiptId) {
    try {
      const receiptResponse = await fetch(`https://${SIRENIC_HOST}/verifier/${encodeURIComponent(candidateReceiptId)}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        credentials: "omit",
        redirect: "error",
        signal: AbortSignal.timeout(10_000)
      });
      const receipt = await receiptResponse.json() as {
        verdict?: string;
        signature?: { kid?: string; corps_sha256?: string; message_signe?: string };
      };
      const signedText = new TextDecoder().decode(signedMessage);
      if (receiptResponse.ok && receipt.verdict === "valide" &&
        receipt.signature?.corps_sha256 === digestBase64 &&
        receipt.signature?.kid === keyId &&
        receipt.signature?.message_signe === signedText) {
        verificationId = candidateReceiptId;
      }
    } catch {
      // Offline Ed25519 verification is sufficient; only expose the optional receipt link when it matches these bytes.
    }
  }
  return { keyId, verificationId };
}

export default function LiveCompanyLookup({ enabled }: { enabled: boolean }) {
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [quote, setQuote] = useState<LiveQuote | null>(null);
  const [result, setResult] = useState<LiveResult | null>(null);
  const [busy, setBusy] = useState<"connect" | "quote" | "pay" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const numberCheck = validateNumber(registrationNumber);

  useEffect(() => {
    const wallet = window.ethereum;
    if (!wallet?.on) return;
    const accountsChanged = (accounts: unknown) => {
      const first = Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : null;
      setWalletAddress(first && /^0x[a-fA-F0-9]{40}$/.test(first) ? first : null);
      setQuote(null);
      setResult(null);
    };
    const chainChanged = () => {
      setQuote(null);
      setResult(null);
    };
    wallet.on("accountsChanged", accountsChanged);
    wallet.on("chainChanged", chainChanged);
    return () => {
      wallet.removeListener?.("accountsChanged", accountsChanged);
      wallet.removeListener?.("chainChanged", chainChanged);
    };
  }, []);

  async function connectWallet() {
    setBusy("connect");
    setError(null);
    try {
      const wallet = window.ethereum;
      if (!wallet) throw new Error("Install or open an EVM browser wallet, such as MetaMask, then return here.");
      const accounts = await wallet.request({ method: "eth_requestAccounts" });
      if (!Array.isArray(accounts) || typeof accounts[0] !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(accounts[0])) {
        throw new Error("The wallet did not return a valid account.");
      }
      setWalletAddress(accounts[0]);
      setResult(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not connect to the wallet.");
    } finally {
      setBusy(null);
    }
  }

  async function getQuote() {
    setBusy("quote");
    setError(null);
    setResult(null);
    setQuote(null);
    try {
      if (numberCheck.error) throw new Error(numberCheck.error);
      const url = companyUrl(numberCheck.normalized);
      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        credentials: "omit",
        redirect: "error",
        signal: AbortSignal.timeout(20_000)
      });
      if (response.status !== 402) {
        if (response.ok) throw new Error("The provider returned data without a payment quote. Veyra stopped without accepting an unquoted result.");
        throw new Error(`Sirenic returned HTTP ${response.status}. No payment was made.`);
      }
      const header = response.headers.get("PAYMENT-REQUIRED");
      if (!header) throw new Error("Sirenic did not return a readable x402 quote. No payment was made.");
      const { decodePaymentRequiredHeader } = await import("@x402/core/http");
      const paymentRequired = decodePaymentRequiredHeader(header);
      if (paymentRequired.x402Version !== 2) throw new Error("This page accepts only the current x402 v2 payment format.");
      const requirement = paymentRequired.accepts.find((item) =>
        item.scheme === "exact" &&
        item.network === "eip155:8453" &&
        item.asset.toLowerCase() === BASE_USDC.toLowerCase()
      );
      if (!requirement) throw new Error("The quote does not offer exact Base USDC. Veyra will not select another network or token.");
      if (requirement.extra?.name !== "USD Coin" || requirement.extra?.version !== "2") {
        throw new Error("The Base USDC quote has an unexpected signing domain. No payment was made.");
      }
      if (!/^\d+$/.test(requirement.amount)) throw new Error("The quote amount is invalid. No payment was made.");
      const amount = Number(requirement.amount);
      if (!Number.isSafeInteger(amount) || amount <= 0 || amount > MAX_AMOUNT_ATOMIC) throw new Error("This quote exceeds Veyra's $0.005 USDC per-lookup limit. No payment was made.");
      if (!/^0x[a-fA-F0-9]{40}$/.test(requirement.payTo)) throw new Error("The quote has an invalid recipient address. No payment was made.");
      if (!Number.isSafeInteger(requirement.maxTimeoutSeconds) || requirement.maxTimeoutSeconds < 1 || requirement.maxTimeoutSeconds > 300) {
        throw new Error("The quote has an invalid expiry window. No payment was made.");
      }
      setQuote({
        url,
        registrationNumber: numberCheck.normalized,
        requirement,
        expiresAt: Date.now() + requirement.maxTimeoutSeconds * 1000
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not get the provider quote.");
    } finally {
      setBusy(null);
    }
  }

  async function switchToBase(wallet: InjectedWallet) {
    const chainId = await wallet.request({ method: "eth_chainId" });
    if (typeof chainId === "string" && chainId.toLowerCase() === BASE_CHAIN_ID) return;
    try {
      await wallet.request({ method: "wallet_switchEthereumChain", params: [{ chainId: BASE_CHAIN_ID }] });
    } catch (caught) {
      const errorCode = caught && typeof caught === "object" ? (caught as { code?: number }).code : undefined;
      if (errorCode !== 4902) throw caught;
      await wallet.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: BASE_CHAIN_ID,
          chainName: "Base",
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: ["https://mainnet.base.org"],
          blockExplorerUrls: ["https://basescan.org"]
        }]
      });
      await wallet.request({ method: "wallet_switchEthereumChain", params: [{ chainId: BASE_CHAIN_ID }] });
    }
  }

  async function payForLookup() {
    if (!quote || !walletAddress) return;
    let paymentMayHaveSettled = false;
    setBusy("pay");
    setError(null);
    setResult(null);
    try {
      if (Date.now() > quote.expiresAt) throw new Error("This quote expired. Request a fresh quote before signing.");
      if (numberCheck.error || numberCheck.normalized !== quote.registrationNumber) {
        throw new Error("The input changed after the quote. Request a fresh quote before signing.");
      }
      const wallet = window.ethereum;
      if (!wallet) throw new Error("Reconnect your browser wallet before paying.");
      await switchToBase(wallet);
      const currentAccounts = await wallet.request({ method: "eth_accounts" });
      if (!Array.isArray(currentAccounts) || typeof currentAccounts[0] !== "string" || currentAccounts[0].toLowerCase() !== walletAddress.toLowerCase()) {
        throw new Error("The connected wallet account changed. Reconnect and request a new quote.");
      }

      const [evm, fetchSdk, viem] = await Promise.all([
        import("@x402/evm/exact/client"),
        import("@x402/fetch"),
        import("viem")
      ]);
      const { registerExactEvmScheme } = evm;
      const { x402Client, wrapFetchWithPayment, decodePaymentResponseHeader } = fetchSdk;
      const { createWalletClient, custom } = viem;
      const walletClient = createWalletClient({
        account: walletAddress as `0x${string}`,
        chain: base,
        transport: custom(wallet as Parameters<typeof custom>[0])
      });
      const signer = {
        address: walletAddress as `0x${string}`,
        signTypedData: (typedData: { domain: Record<string, unknown>; types: Record<string, unknown>; primaryType: string; message: Record<string, unknown> }) =>
          walletClient.signTypedData({ account: walletAddress as `0x${string}`, ...typedData } as never)
      };
      const sameQuote = (item: { scheme: string; network: string; amount: string; asset: string; payTo: string; maxTimeoutSeconds: number; extra?: Record<string, unknown> | null }) =>
        item.scheme === quote.requirement.scheme &&
        item.network === quote.requirement.network &&
        item.amount === quote.requirement.amount &&
        item.asset.toLowerCase() === quote.requirement.asset.toLowerCase() &&
        item.payTo.toLowerCase() === quote.requirement.payTo.toLowerCase() &&
        item.maxTimeoutSeconds === quote.requirement.maxTimeoutSeconds &&
        item.extra?.name === quote.requirement.extra?.name &&
        item.extra?.version === quote.requirement.extra?.version;
      const client = new x402Client();
      client.setSpendControls({
        maxAmountPerPayment: "$0.005",
        allowedAssets: [{ network: "eip155:8453", asset: BASE_USDC, maxAmountPerPayment: MAX_AMOUNT_ATOMIC.toString() }]
      });
      registerExactEvmScheme(client, {
        signer,
        networks: ["eip155:8453"],
        policies: [(_version, requirements) => requirements.filter(sameQuote)]
      });
      const fetchWithPayment = wrapFetchWithPayment(fetch, client);
      paymentMayHaveSettled = true;
      const response = await fetchWithPayment(quote.url, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        credentials: "omit",
        redirect: "error",
        signal: AbortSignal.timeout(120_000)
      });
      if (response.status !== 200) throw new Error(`Sirenic returned HTTP ${response.status}. Check your wallet activity before retrying.`);
      const bodyBytes = await response.arrayBuffer();
      const signature = await verifySirenicResponse(response, bodyBytes);
      const payload = JSON.parse(new TextDecoder().decode(bodyBytes)) as Record<string, unknown>;
      const returnedNumber = typeof payload.id_national === "string" ? normalizeNumber(payload.id_national) :
        typeof payload.siren === "string" ? normalizeNumber(payload.siren) : "";
      const legalName = typeof payload.denomination === "string" ? payload.denomination.trim() : "";
      if (!returnedNumber || returnedNumber !== quote.registrationNumber || !legalName) {
        throw new Error("The paid response did not match the requested registration number or had no legal name. Veyra stopped before drawing a conclusion.");
      }
      const status = typeof payload.statut_detail === "string" ? payload.statut_detail :
        typeof payload.etat_administratif === "string" ? payload.etat_administratif :
        typeof payload.statut === "string" ? payload.statut : "Not provided";
      const paymentHeader = response.headers.get("PAYMENT-RESPONSE");
      let transactionHash: string | null = null;
      if (paymentHeader) {
        try { transactionHash = transactionHashFrom(decodePaymentResponseHeader(paymentHeader)); } catch { transactionHash = null; }
      }
      setResult({
        registrationNumber: quote.registrationNumber,
        legalName,
        status,
        sourceUrl: registryUrl(quote.registrationNumber),
        retrievedAt: new Date().toISOString(),
        transactionHash,
        signingKeyId: signature.keyId,
        verificationId: signature.verificationId
      });
      setQuote(null);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "The paid lookup did not complete.";
      setError(paymentMayHaveSettled
        ? `${message} A payment may have settled; check your wallet and Sirenic activity before requesting another quote.`
        : message);
      if (paymentMayHaveSettled) setQuote(null);
    } finally {
      setBusy(null);
    }
  }

  const amountLabel = quote ? `$${formatUsdc(quote.requirement.amount)} USDC` : "the quoted amount";
  const quoteExpired = Boolean(quote && Date.now() > quote.expiresAt);

  if (!enabled) {
    return (
      <section className="panel wallet-check-panel" aria-labelledby="wallet-check-title">
        <p className="eyebrow">Live company registry check</p>
        <h2 id="wallet-check-title">Wallet payments are disabled in Preview</h2>
        <p className="wallet-check-copy">Vercel Preview deployments do not accept live payments. Open the Production site to use a personal Base wallet, or explore the illustrative scenarios below.</p>
      </section>
    );
  }

  return (
    <section className="panel wallet-check-panel" aria-labelledby="wallet-check-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Live company registry check</p>
          <h2 id="wallet-check-title">Run a real Sirenic lookup with your wallet</h2>
        </div>
        <span className="status-pill"><span className="status-dot" />Your wallet pays</span>
      </div>
      <p className="wallet-check-copy">Connect a Base wallet, inspect the provider’s quote, then approve one exact USDC payment in your wallet. Veyra never receives your keys, and the Passport wallet is not used.</p>

      <div className="wallet-check-grid">
        <label className="wallet-check-field">
          <span>Nine-digit French SIREN</span>
          <input
            autoComplete="off"
            inputMode="numeric"
            maxLength={14}
            placeholder="e.g. 552032534"
            value={registrationNumber}
            onChange={(event) => { setRegistrationNumber(event.target.value); setQuote(null); setResult(null); }}
            disabled={busy !== null}
          />
        </label>
      </div>

      <div className="wallet-check-actions">
        {walletAddress ? (
          <>
            <span className="wallet-connected-status">Connected {shortAddress(walletAddress)}</span>
            <button className="button button-secondary" type="button" onClick={() => { setWalletAddress(null); setQuote(null); setResult(null); }} disabled={busy !== null}>Clear from this page</button>
          </>
        ) : (
          <button className="button button-secondary" type="button" onClick={() => void connectWallet()} disabled={busy !== null}>
            {busy === "connect" ? "Connecting…" : "Connect Base wallet"}
          </button>
        )}
        <button className="button button-primary" type="button" onClick={() => void getQuote()} disabled={busy !== null || Boolean(numberCheck.error)}>
          {busy === "quote" ? "Getting quote…" : "Get live quote"}
        </button>
      </div>
      {numberCheck.error && registrationNumber.trim() && <p className="wallet-check-error" role="status">{numberCheck.error}</p>}
      {error && <p className="wallet-check-error" role="alert">{error}</p>}

      {quote && (
        <div className="wallet-quote" aria-live="polite">
          <p className="eyebrow">Review before signing</p>
          <dl className="wallet-quote-rows">
            <div><dt>Amount</dt><dd>{amountLabel}</dd></div>
            <div><dt>Network</dt><dd>Base Mainnet</dd></div>
            <div><dt>Token</dt><dd>USDC</dd></div>
            <div><dt>Recipient</dt><dd><code>{quote.requirement.payTo}</code></dd></div>
            <div><dt>Request</dt><dd>French company profile · {quote.registrationNumber}</dd></div>
            <div><dt>Quote window</dt><dd>{quote.requirement.maxTimeoutSeconds} seconds</dd></div>
          </dl>
          <p className="caption">Your wallet signs a one-time authorization for this exact amount and recipient. The x402 facilitator settles it on Base; the exact payment is capped at $0.005 per lookup. There is no shared Veyra wallet charge.</p>
          <button className="button button-primary" type="button" onClick={() => void payForLookup()} disabled={!walletAddress || busy !== null || quoteExpired}>
            {busy === "pay" ? "Waiting for wallet and provider…" : walletAddress ? `Approve ${amountLabel} in wallet` : "Connect a wallet to approve"}
          </button>
          {quoteExpired && <p className="wallet-check-error" role="status">Quote expired. Get a fresh quote.</p>}
        </div>
      )}

      {result && (
        <div className="wallet-result" aria-live="polite">
          <div className="panel-heading">
            <div><p className="eyebrow">Live provider response</p><h3>{result.legalName}</h3></div>
            <span className="status-pill"><span className="status-dot" />Review required</span>
          </div>
          <dl className="wallet-quote-rows">
            <div><dt>Registration</dt><dd>FR · {result.registrationNumber}</dd></div>
            <div><dt>Registry status</dt><dd>{result.status}</dd></div>
            <div><dt>Source</dt><dd><a href={result.sourceUrl} target="_blank" rel="noreferrer">Open official registry</a></dd></div>
            <div><dt>Retrieved</dt><dd>{new Date(result.retrievedAt).toLocaleString()}</dd></div>
            <div><dt>Signature</dt><dd>Verified · Sirenic key {result.signingKeyId}</dd></div>
            {result.verificationId && <div><dt>Public receipt</dt><dd><a href={`https://${SIRENIC_HOST}/verifier/${encodeURIComponent(result.verificationId)}`} target="_blank" rel="noreferrer">Open Sirenic verification receipt</a></dd></div>}
            <div><dt>Payment</dt><dd>{result.transactionHash ? <a href={`https://basescan.org/tx/${result.transactionHash}`} target="_blank" rel="noreferrer">View Base receipt</a> : "Sirenic returned the paid response; no transaction reference was exposed."}</dd></div>
          </dl>
          <p className="caption">The Sirenic response signature was checked in your browser against the published Ed25519 key. This confirms the returned registry record only; it does not verify bank-account ownership, payment instructions, sanctions status or solvency. A person must make the business decision.</p>
        </div>
      )}

      <div className="wallet-check-note">
        <strong>What you need:</strong> an injected Base wallet and enough Base USDC for the amount shown. The EIP-3009 x402 signature is gasless; the wallet displays the authorization before it is sent.
      </div>
    </section>
  );
}
