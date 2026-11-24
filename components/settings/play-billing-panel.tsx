"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
type Purchase = { purchaseToken: string; itemId: string };
type Goods = {
  getDetails: (
    ids: string[],
  ) => Promise<
    Array<{ itemId: string; price: { currency: string; value: string } }>
  >;
  listPurchases: () => Promise<Purchase[]>;
};
type PlayWindow = Window & {
  getDigitalGoodsService?: (url: string) => Promise<Goods>;
};
export function PlayBillingPanel() {
  const [service, setService] = useState<Goods | null>(null),
    [price, setPrice] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [config, setConfig] = useState<{
      enabled: boolean;
      productId: string;
      accountId: string;
    } | null>(null);
  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const c = await fetch("/api/billing/play", { cache: "no-store" }).then(
          (r) => r.json(),
        );
        if (!canceled) setConfig(c);
        const svc = await (window as PlayWindow).getDigitalGoodsService?.(
          "https://play.google.com/billing",
        );
        if (!svc) return;
        if (!canceled) setService(svc);
        const items = await svc.getDetails([c.productId]);
        const item = items.find((i) => i.itemId === c.productId);
        if (item && !canceled)
          setPrice(
            new Intl.NumberFormat(navigator.language, {
              style: "currency",
              currency: item.price.currency,
            }).format(Number(item.price.value)),
          );
      } catch {
        if (!canceled)
          setError(
            "Google Play billing is unavailable. Please try again later.",
          );
      }
    })();
    return () => {
      canceled = true;
    };
  }, []);
  async function verify(token: string) {
    const r = await fetch("/api/billing/play", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purchaseToken: token }),
    });
    const b = await r.json();
    if (!r.ok) throw Error(b.error || "Purchase verification failed");
    return b;
  }
  async function restore() {
    setBusy(true);
    setError("");
    try {
      if (!service || !config)
        throw Error("Open the installed Google Play app to restore purchases.");
      const purchases = await service.listPurchases();
      const matching = purchases.filter((p) => p.itemId === config.productId);
      if (!matching.length)
        throw Error(
          "No GrantFlow purchase was found for this Google Play account.",
        );
      for (const p of matching) await verify(p.purchaseToken);
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setBusy(false);
    }
  }
  async function buy() {
    if (!service || !config || !price) return;
    setBusy(true);
    setError("");
    let response: PaymentResponse | undefined;
    try {
      const check = await fetch("/api/billing/play/eligibility", {
        cache: "no-store",
      });
      const eligibility = await check.json();
      if (!check.ok) throw Error(eligibility.error);
      const request = new PaymentRequest(
        [
          {
            supportedMethods: "https://play.google.com/billing",
            data: {
              sku: config.productId,
              obfuscatedAccountId: config.accountId,
            },
          },
        ],
        {
          total: {
            label: "GrantFlow Pro",
            amount: { currency: "USD", value: "0" },
          },
        },
      );
      response = await request.show();
      const result = await verify(
        (response.details as { purchaseToken: string }).purchaseToken,
      );
      await response.complete("success");
      response = undefined;
      if (!result.active)
        throw Error(
          "Your payment is pending. Restore purchases after Google Play confirms payment; do not purchase again.",
        );
      window.location.reload();
    } catch (e) {
      if (response) await response.complete("fail").catch(() => {});
      setError(
        e instanceof Error && e.name === "AbortError"
          ? "Purchase canceled."
          : e instanceof Error
            ? e.message
            : "Purchase could not be completed.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-3">
      <p className="text-sm">
        Use your existing GrantFlow account. Existing Pro access remains
        available.
      </p>
      <p className="text-xs text-gray-600">
        {price
          ? price +
            " per month. Automatically renews until canceled. Manage or cancel in Google Play."
          : "Google Play subscription pricing will appear when purchases are available."}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={buy}
          disabled={busy || !service || !price || !config?.enabled}
        >
          Subscribe with Google Play
        </Button>
        <Button
          variant="secondary"
          onClick={restore}
          disabled={busy || !service || !config?.enabled}
        >
          Restore purchases
        </Button>
      </div>
      <a
        className="text-sm underline"
        href="https://play.google.com/store/account/subscriptions?package=com.nocapsai.grantflow&sku=grantflow_pro"
        target="_blank"
        rel="noopener noreferrer"
      >
        Manage Google Play subscriptions
      </a>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
