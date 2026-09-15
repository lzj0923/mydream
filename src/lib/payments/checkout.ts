export const paymentGateways = [
  "https://core.newebpay.com/MPG/mpg_gateway",
  "https://ccore.newebpay.com/MPG/mpg_gateway",
] as const;

export type Checkout = { orderNo: string; environment: "test" | "production"; gateway: string; fields: Record<string, string> };

export function parseCheckout(value: unknown): Checkout {
  if (!value || typeof value !== "object") throw new Error("Invalid checkout");
  const c = value as Checkout;
  if (!/^MD[a-f0-9]{28}$/.test(c.orderNo) || !["test", "production"].includes(c.environment)
    || c.gateway !== paymentGateways[c.environment === "production" ? 0 : 1]
    || !c.fields || !/^[A-Za-z0-9]{1,15}$/.test(c.fields.MerchantID)
    || !/^[a-f0-9]+$/i.test(c.fields.TradeInfo) || c.fields.TradeInfo.length % 32 !== 0
    || !/^[A-F0-9]{64}$/.test(c.fields.TradeSha) || c.fields.Version !== "2.3") throw new Error("Invalid checkout");
  return { orderNo: c.orderNo, environment: c.environment, gateway: c.gateway, fields: {
    MerchantID: c.fields.MerchantID, TradeInfo: c.fields.TradeInfo, TradeSha: c.fields.TradeSha, Version: "2.3",
  } };
}
