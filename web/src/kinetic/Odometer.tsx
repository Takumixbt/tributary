/*
 * Rolling counter. Zone: src/kinetic/**.
 *
 * Every digit lives in its own overflow-hidden column and translates vertically
 * with a spring ease when the value changes. Tabular numerals guarantee zero
 * layout shift, and the separator is a fixed-width column so grouped numbers do
 * not jitter. Reduced motion cross-fades the digit instead of rolling it.
 *
 * The wheel model is a real odometer, not a per-digit swap: column p reads
 * value / 10^p, holds its digit until the fraction is nearly carried, then rolls
 * to the next one. A jump of 3.42 therefore spins the low wheels and barely
 * moves the high ones, which is what makes the number read as a machine.
 *
 * Amounts are micro-USDC bigints everywhere else in this app. Convert at the
 * call site: <Odometer value={toUsdcNumber(vault.totalAssets)} decimals={2} />
 */

import { memo, useMemo, useRef } from "react";
import { THIN } from "../lib/format";
import { clamp, damp, smoothstep } from "../lib/motion";
import { useMotion, useTick } from "./MotionProvider";
import "./kinetic.css";

/** Digit cell height. Mirrors --odo-cell in kinetic.css. */
const CELL = 1;
/** Fraction of a digit's travel spent holding still before it carries. */
const CARRY = 0.86;
/** Half-life of the approach to the target value. */
const HALF_LIFE = 88;
/** Reduced-motion digit cross-fade window. Matches --dur-flash under reduce. */
const FADE_MS = 400;

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

export interface OdometerProps {
  value: number;
  /** Fixed decimal places. Default 2. */
  decimals?: number;
  /** Thin-space grouping on the integer part. Default true. */
  group?: boolean;
  /** Pad the integer part with leading zeros to this width. */
  pad?: number;
  prefix?: string;
  suffix?: string;
  /** Render sub-cent digits at reduced opacity. Default true above 2 decimals. */
  dimTail?: boolean;
  className?: string;
  /** Accessible label, since the digit columns are decorative markup. */
  label?: string;
  /**
   * Continuous growth between value updates, in units per second. Interest
   * accrues per second on chain, so the counter accrues per second on screen.
   */
  accrualPerSecond?: number;
}

type Column =
  | { kind: "digit"; power: number; dim: boolean }
  | { kind: "sep"; char: string; role: "group" | "point" | "sign" };

function buildColumns(
  value: number,
  decimals: number,
  group: boolean,
  pad: number | undefined,
  dimTail: boolean,
): Column[] {
  const abs = Math.abs(value);
  const wholeDigits = Math.floor(abs).toString().length;
  const intLen = Math.max(pad ?? 1, wholeDigits);
  const columns: Column[] = [];

  if (value < 0) columns.push({ kind: "sep", char: "-", role: "sign" });

  for (let power = intLen - 1; power >= 0; power--) {
    columns.push({ kind: "digit", power, dim: false });
    if (group && power > 0 && power % 3 === 0) {
      columns.push({ kind: "sep", char: THIN, role: "group" });
    }
  }

  if (decimals > 0) {
    columns.push({ kind: "sep", char: ".", role: "point" });
    for (let i = 1; i <= decimals; i++) {
      columns.push({ kind: "digit", power: -i, dim: dimTail && i > 2 });
    }
  }

  return columns;
}

/** Continuous wheel position for one column, in cells. Range [0, 10]. */
function wheel(value: number, power: number): number {
  const scaled = Math.abs(value) / Math.pow(10, power);
  const whole = Math.floor(scaled);
  const frac = scaled - whole;
  const roll = frac > CARRY ? smoothstep((frac - CARRY) / (1 - CARRY)) : 0;
  return (whole % 10) + roll;
}

function OdometerImpl({
  value,
  decimals = 2,
  group = true,
  pad,
  prefix,
  suffix,
  dimTail,
  className,
  label,
  accrualPerSecond = 0,
}: OdometerProps) {
  const { motionScale } = useMotion();
  const safe = Number.isFinite(value) ? value : 0;
  const tail = dimTail ?? decimals > 2;

  const columns = useMemo(
    () => buildColumns(safe, decimals, group, pad, tail),
    [safe, decimals, group, pad, tail],
  );

  const strips = useRef(new Map<number, HTMLSpanElement>());
  const cells = useRef(new Map<number, HTMLSpanElement>());
  const written = useRef(new Map<number, number>());
  const fades = useRef(new Map<number, number>());

  const target = useRef(safe);
  target.current = safe;
  const seen = useRef(safe);
  const accrued = useRef(0);
  const display = useRef(safe);
  const primed = useRef(false);

  const rate = useRef(accrualPerSecond);
  rate.current = accrualPerSecond;
  const reduced = motionScale === 0;
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  useTick((dt) => {
    if (seen.current !== target.current) {
      seen.current = target.current;
      accrued.current = 0;
    }
    if (rate.current) accrued.current += (rate.current * dt) / 1000;

    const goal = seen.current + accrued.current;
    if (!primed.current || reducedRef.current) {
      display.current = goal;
      primed.current = true;
    } else {
      display.current = damp(display.current, goal, HALF_LIFE, dt);
      const epsilon = Math.pow(10, -decimals) * 0.004;
      if (Math.abs(display.current - goal) < epsilon) display.current = goal;
    }

    const current = display.current;
    for (const [power, strip] of strips.current) {
      const offset = reducedRef.current
        ? Math.floor(Math.abs(current) / Math.pow(10, power)) % 10
        : wheel(current, power);
      const last = written.current.get(power);
      if (last === undefined || Math.abs(last - offset) > 0.0015) {
        strip.style.transform = `translateY(${-offset * CELL}em)`;
        if (reducedRef.current && last !== undefined && last !== offset) {
          fades.current.set(power, FADE_MS);
        }
        written.current.set(power, offset);
      }
    }

    if (fades.current.size > 0) {
      for (const [power, left] of fades.current) {
        const next = left - dt;
        const cell = cells.current.get(power);
        if (next <= 0) {
          if (cell) cell.style.opacity = "";
          fades.current.delete(power);
        } else {
          if (cell) cell.style.opacity = `${clamp(1 - 0.65 * (next / FADE_MS), 0, 1)}`;
          fades.current.set(power, next);
        }
      }
    }
  });

  const plain = `${safe < 0 ? "-" : ""}${Math.abs(safe).toFixed(decimals)}`;
  const readable = label ?? `${prefix ? prefix + " " : ""}${plain}${suffix ? " " + suffix : ""}`;

  return (
    <span className={`odometer num${className ? " " + className : ""}`} role="img" aria-label={readable}>
      {prefix ? (
        <span className="odometer-affix" aria-hidden="true">
          {prefix}
        </span>
      ) : null}
      <span className="odometer-digits" aria-hidden="true">
        {columns.map((column, index) =>
          column.kind === "sep" ? (
            <span
              key={`s${index}`}
              className={`odometer-sep${column.role === "group" ? "" : ` is-${column.role}`}`}
            >
              {column.char}
            </span>
          ) : (
            <span
              key={`d${column.power}`}
              className={`odometer-col${column.dim ? " num-tail" : ""}`}
              ref={(el) => {
                if (el) cells.current.set(column.power, el);
                else cells.current.delete(column.power);
              }}
            >
              <span
                className="odometer-strip"
                ref={(el) => {
                  if (el) {
                    strips.current.set(column.power, el);
                    written.current.delete(column.power);
                  } else {
                    strips.current.delete(column.power);
                  }
                }}
              >
                {DIGITS.map((digit, i) => (
                  <span className="odometer-digit" key={i}>
                    {digit}
                  </span>
                ))}
              </span>
            </span>
          ),
        )}
      </span>
      {suffix ? (
        <span className="odometer-affix num-unit" aria-hidden="true">
          {suffix}
        </span>
      ) : null}
    </span>
  );
}

/**
 * Memoised: parents that re-render on every snapshot must not rebuild eleven
 * cells per digit when the number itself has not moved.
 */
export const Odometer = memo(OdometerImpl);

export default Odometer;
