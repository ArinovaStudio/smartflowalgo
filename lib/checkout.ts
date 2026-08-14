import { z } from "zod";

// Adjust these two regexes if you need to support non-Indian numbers or
// TradingView's actual username rules — these are reasonable defaults.
const MOBILE_REGEX = /^\+?[1-9]\d{6,14}$/;
const TRADINGVIEW_ID_REGEX = /^[a-zA-Z0-9_\.-]{3,30}$/;

export const checkoutFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name is too long"),
  tradingViewId: z
    .string()
    .trim()
    .min(3, "TradingView ID must be at least 3 characters")
    .max(30, "TradingView ID is too long")
    .regex(TRADINGVIEW_ID_REGEX, "Only letters, numbers, _, . and - are allowed"),
  broker: z
    .string()
    .trim()
    .min(2, "Broker name must be at least 2 characters")
    .max(50, "Broker name is too long"),
  mobile: z
    .string()
    .trim()
    .regex(MOBILE_REGEX, "Enter a valid 10-digit mobile number"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  promoterId: z.string().optional().nullable(),
  version: z.string().optional()
});

export type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;

// Full payload sent to POST /api/save-data (form values + plan context)
export const saveDataSchema = checkoutFormSchema.extend({
  planType: z.enum(["APPLIED", "PAID"]),
});

export type SaveDataInput = z.infer<typeof saveDataSchema>;

export type DuplicateField = "email" | "mobile" | "tradingViewId";