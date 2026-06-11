import crypto from "crypto";

export const LIQPAY_CHECKOUT_URL = "https://www.liqpay.ua/api/3/checkout";

export function getLiqpayKeys(): { publicKey: string; privateKey: string } | null {
  const publicKey = process.env.LIQPAY_PUBLIC_KEY;
  const privateKey = process.env.LIQPAY_PRIVATE_KEY;
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey };
}

export function liqpaySign(privateKey: string, data: string): string {
  return crypto
    .createHash("sha1")
    .update(privateKey + data + privateKey)
    .digest("base64");
}

export function liqpayEncode(obj: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(obj)).toString("base64");
}

export function liqpayDecode(data: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(data, "base64").toString("utf8"));
}

export function verifyLiqpayCallback(privateKey: string, data: string, signature: string): boolean {
  return liqpaySign(privateKey, data) === signature;
}

export interface LiqpayPaymentParams {
  publicKey: string;
  privateKey: string;
  /** Amount in USD cents — will be converted to dollars */
  amountCents: number;
  description: string;
  orderId: string;
  serverUrl: string;
  resultUrl: string;
  sandbox?: boolean;
}

export function buildLiqpayCheckout(p: LiqpayPaymentParams): { data: string; signature: string } {
  const obj: Record<string, unknown> = {
    version: 3,
    public_key: p.publicKey,
    action: "pay",
    amount: (p.amountCents / 100).toFixed(2),
    currency: "USD",
    description: p.description,
    order_id: p.orderId,
    server_url: p.serverUrl,
    result_url: p.resultUrl,
  };
  if (p.sandbox) obj.sandbox = 1;

  const data = liqpayEncode(obj);
  return { data, signature: liqpaySign(p.privateKey, data) };
}
