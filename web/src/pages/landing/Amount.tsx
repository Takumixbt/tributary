/*
 * Zone: src/pages/landing/**.
 *
 * A micro-USDC amount in the product's three weights: integer and cents at full
 * strength, the sub-cent tail at 0.4. A six-decimal nanopayment then scans as a
 * number instead of reading as noise, which is the whole reason the tail exists.
 */

import { splitAmount } from "../../lib/format";
import type { Micro } from "../../lib/types";

export function Amount({ value, unit }: { value: Micro; unit?: boolean }) {
  const { int, cents, tail } = splitAmount(value);
  return (
    <span className="num">
      {int}.{cents}
      {tail ? <span className="num-tail">{tail}</span> : null}
      {unit ? <span className="num-unit">USDC</span> : null}
    </span>
  );
}

export default Amount;
