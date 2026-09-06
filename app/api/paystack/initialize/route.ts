import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: string; amount?: number; reference?: string; currency?: string } | null;
  if (!body?.email || !body.reference || !Number.isFinite(body.amount) || !body.currency) {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "PAYSTACK_NOT_CONFIGURED" }, { status: 503 });

  const amountMinor = Math.round(body.amount! * 100);
  if (amountMinor <= 0 || amountMinor > 100000000) return NextResponse.json({ error: "INVALID_AMOUNT" }, { status: 400 });

  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email: body.email, amount: amountMinor, currency: body.currency, reference: body.reference }),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({ status: false, message: "PAYSTACK_INVALID_RESPONSE" }));
  if (!response.ok || data?.status !== true) return NextResponse.json({ error: "PAYSTACK_INITIALIZATION_FAILED", message: data?.message ?? "Unable to initialize payment" }, { status: 502 });
  return NextResponse.json({ authorization_url: data.data?.authorization_url, access_code: data.data?.access_code, reference: data.data?.reference });
}
