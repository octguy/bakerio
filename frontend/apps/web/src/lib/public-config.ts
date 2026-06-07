const DEFAULT_ORDER_URL = "https://order.bakerio.thinhuit.id.vn";

export function getOrderUrl() {
  return process.env.NEXT_PUBLIC_ORDER_URL?.trim() || DEFAULT_ORDER_URL;
}

export function getContactEndpoint() {
  const endpoint = process.env.NEXT_PUBLIC_CONTACT_ENDPOINT?.trim();
  return endpoint ? endpoint : null;
}
