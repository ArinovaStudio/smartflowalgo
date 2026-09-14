import type { DrawingItem } from "./types";

/**
 * When the user clicks (rather than drags) to place a drawing, we still want
 * a sensible, professional-looking default size/shape instead of a zero-area
 * point. This function mutates a shallow copy of the drawing to give it that
 * default geometry, based on its tool type.
 *
 * Kept as a pure function (drawing in, drawing out) so it's easy to unit test
 * independently of any mouse-event or React state.
 */
export function applyDefaultDrawingGeometry(drawing: DrawingItem): DrawingItem {
  const result: DrawingItem = { ...drawing };
  const { startX: x, startY: y, type } = result;

  switch (true) {
    case type === "trendline" ||
      type === "info_line" ||
      type === "trend_angle" ||
      type === "regression_line": {
      result.endX = x + 160;
      result.endY = y - 40;
      break;
    }

    case type === "ray" || type === "extended_line": {
      result.endX = x + 180;
      result.endY = y - 30;
      break;
    }

    case type === "horizontal" || type === "horizontal_ray": {
      result.startX = type === "horizontal_ray" ? x : 0;
      result.endX = 9999;
      result.endY = y;
      break;
    }

    case type === "vertical": {
      result.startY = 0;
      result.endY = 9999;
      break;
    }

    case type === "fvg_bull" || type === "fvg_bear": {
      result.endX = x + 160;
      result.endY = y + 28;
      break;
    }

    case type.includes("block") ||
      type === "rectangle" ||
      type === "gann_box" ||
      type === "imbalance_void": {
      result.endX = x + 160;
      result.endY = y + 45;
      break;
    }

    case type === "choch" || type === "bos" || type === "eqh_eql": {
      result.startX = Math.max(0, x - 50);
      result.endX = x + 90;
      result.label = type === "choch" ? "CHoCH" : type === "bos" ? "BOS" : "EQH / EQL";
      break;
    }

    case type === "premium_discount": {
      result.endX = x + 200;
      result.endY = y + 80;
      break;
    }

    case type === "long_position": {
      result.endX = x + 160;
      result.endY = y - 50; // TP height
      break;
    }

    case type === "short_position": {
      result.endX = x + 160;
      result.endY = y + 50; // SL height
      break;
    }

    case type === "measure" || type === "price_range" || type === "date_and_price": {
      result.endX = x + 140;
      result.endY = y + 50;
      break;
    }

    case type === "circle" || type === "ellipse": {
      result.endX = x + 90;
      result.endY = y + 60;
      break;
    }

    case type === "triangle" || type === "rising_wedge" || type === "falling_wedge": {
      result.endX = x + 150;
      result.endY = y + 60;
      break;
    }

    case type.includes("fib") || type.includes("pitchfork"): {
      result.endX = x + 200;
      result.endY = y + 100;
      break;
    }

    case type.includes("pattern") ||
      type.includes("wave") ||
      type === "head_and_shoulders" ||
      type === "double_top" ||
      type === "double_bottom": {
      result.endX = x + 180;
      result.endY = y + 70;
      break;
    }

    case type === "text" || type === "note" || type === "callout": {
      result.endX = x + 100;
      result.endY = y + 30;
      result.label = "Analysis Note";
      break;
    }

    case type.startsWith("icon_"): {
      result.endX = x + 24;
      result.endY = y + 24;
      break;
    }

    default:
      // Leave as-is for any tool without a bespoke default (falls back to
      // whatever zero/near-zero size the click produced).
      break;
  }

  return result;
}

/** True if the pointer moved less than this many px — treated as a "click" not a "drag". */
export const CLICK_VS_DRAG_THRESHOLD_PX = 8;
