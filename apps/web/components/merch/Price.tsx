import { formatMoney } from "@/lib/merch/money";
import type { Money } from "@/lib/merch/types";

export function Price({
  price,
  compareAt,
  from = false,
  className = "",
}: {
  price: Money;
  compareAt?: Money;
  from?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-2 font-mono ${className}`}>
      <span className="text-bone">
        {from && <span className="text-smoke">from </span>}
        {formatMoney(price)}
      </span>
      {compareAt && (
        <s className="text-smoke">
          <span className="sr-only">was </span>
          {formatMoney(compareAt)}
        </s>
      )}
    </span>
  );
}

export function StockLabel({ available, lowStock }: { available: boolean; lowStock?: number }) {
  if (!available) return <span className="mono-label text-accent">sold out</span>;
  if (lowStock) return <span className="mono-label">only {lowStock} left</span>;
  return null;
}
