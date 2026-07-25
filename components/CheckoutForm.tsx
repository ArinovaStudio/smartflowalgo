"use client";

import { useEffect, useState, type FormEvent, type InputHTMLAttributes } from "react";
import { motion } from "framer-motion";
import PhoneInput from "react-phone-input-2";
// @ts-ignore: CSS module declaration not available for this package side-effect import
import "react-phone-input-2/lib/style.css";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  MessageCircle,
} from "lucide-react";
import type { PlanPayload } from "@/lib/plan-token";
import {
  checkoutFormSchema,
  type CheckoutFormValues,
  type DuplicateField,
} from "@/lib/checkout";
import CustomSelect from "./Custom-select";

import entry from "@/assets/entry.jpeg"
import v1 from "@/assets/entry.jpeg"
import v2 from "@/assets/entry.jpeg"
import v2_8 from "@/assets/entry.jpeg"
import v3 from "@/assets/entry.jpeg"
import v7 from "@/assets/entry.jpeg"



  const versionOptions = [
  {
    name: "SmartflowAlgo AK PRO VIP V7.0 Final",
    image: v7.src,
  },
  {
    name: "SmartflowAlgo AK PRO VIP V3.0",
    image: v3.src,
  },
  {
    name: " AK PRO VIP V2.8 SL TP Options",
    image: v2_8.src,
  },
  {
    name: "SmartflowAlgo AK PRO VIP V2.7",
    image: v2.src,
  },
    {
    name: "SmartflowAlgo Gold Zones V1.2",
    image: v1.src,
  },
    {
    name: "SmartflowAlgo Reversal Entry Zones",
    image: entry.src,
  },
];

interface CheckoutFormProps {
  plan: PlanPayload;
}

type FieldName = keyof CheckoutFormValues;
type FieldErrors = Partial<Record<FieldName, string>>;

const EMPTY_FORM: CheckoutFormValues = {
  name: "",
  tradingViewId: "",
  mobile: "",
  email: "",
  promoterId: "",
  version: versionOptions[0].name
};

const FIELD_LABELS: Record<FieldName, string> = {
  name: "Name",
  tradingViewId: "TradingView ID",
  mobile: "Mobile number",
  email: "Email address",
  promoterId: "Referral code (optional)",
  version: "Version",
};

// TODO: point these at your real destinations before shipping.
const TELEGRAM_CHANNEL_URL =
  process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_URL ?? "https://t.me/smartflowalgo";

// TODO: point this at your real support handle before shipping.
const SUPPORT_TELEGRAM_HANDLE = "@smartflowtrading";
const SUPPORT_TELEGRAM_URL = "https://t.me/smartflowtrading";

// Upper bound on the raw value react-phone-input-2 stores (country dial
// code digits + up to 12 digits of national number, no formatting spaces).
const MOBILE_MAX_LENGTH = 16;

export default function CheckoutForm({ plan }: CheckoutFormProps) {
  const [discount, setDiscount] = useState<{discount: number, name: string}>()
  const [form, setForm] = useState<CheckoutFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [checking, setChecking] = useState<Partial<Record<FieldName, boolean>>>(
    {},
  );
  const [amount, setAmount] = useState<number>(30)
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isPaid = plan.type === "PAID";

  function updateField(field: FieldName, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear a field's error as soon as the user edits it again.
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setFormError(null);
  }

  async function checkRefCode(code: string) {
    if (discount?.discount) {
      return
    }
    const req = await fetch(`/api/promoters/code?id=${code}`)
    if (req.status === 400) {
      const data = await req.json()
        setErrors((prev) => ({
          ...prev,
          "promoterId": `${data.data}`,
        }));
    }
    if (req.status === 200) {
      const {data} = await req.json()
      console.log(data);
      setDiscount({
        discount: data.discount,
        name: data.name
      })
    }
  }
  // Live duplicate check — fires on blur for email / mobile / tradingViewId.
  async function checkDuplicateOnBlur(field: DuplicateField, rawValue: string) {
    const value = rawValue.trim();
    if (!value) return;

    // Only bother the API once the field is at least well-formed enough
    // to be worth checking — full validation still happens on submit.
    const singleFieldResult = checkoutFormSchema.shape[field].safeParse(value);
    if (!singleFieldResult.success) return;

    setChecking((prev) => ({ ...prev, [field]: true }));
    try {
      const params = new URLSearchParams({ [field]: value });
      const res = await fetch(`/api/save-data?${params.toString()}`);
      const data = await res.json();

      const existsKey = `${field}Exists` as const;
      if (res.ok && data[existsKey]) {
        setErrors((prev) => ({
          ...prev,
          [field]: `This ${FIELD_LABELS[field].toLowerCase()} is already registered`,
        }));
      }
    } catch {
      // Silently ignore — the authoritative check happens again on submit.
    } finally {
      setChecking((prev) => ({ ...prev, [field]: false }));
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setFormError(null);
    setErrors({});

    const result = checkoutFormSchema.safeParse(form);

    if (!result.success) {
      const fieldErrors: FieldErrors = {};

      for (const issue of result.error.issues) {
        const field = issue.path[0] as FieldName;
        fieldErrors[field] = issue.message;
      }

      setErrors(fieldErrors);
      return;
    }

    // promoterId isn't a User field — keep it out of the User payload
    // and only attach it when we create the Payment record.
    const { promoterId, ...clientData } = result.data;
    const normalizedPromoterId = promoterId?.trim() || undefined;

    setSubmitting(true);

    try {
      // Final duplicate check
      const params = new URLSearchParams({
        email: clientData.email,
        mobile: clientData.mobile,
        tradingViewId: clientData.tradingViewId,
      });

      const checkRes = await fetch(`/api/save-data?${params.toString()}`);
      const checkData = await checkRes.json();

      if (checkRes.ok) {
        const dupErrors: FieldErrors = {};

        if (checkData.emailExists)
          dupErrors.email = "This email is already registered";

        if (checkData.mobileExists)
          dupErrors.mobile = "This mobile number is already registered";

        if (checkData.tradingViewIdExists)
          dupErrors.tradingViewId = "This TradingView ID is already registered";

        if (Object.keys(dupErrors).length > 0) {
          setErrors(dupErrors);
          return;
        }
      }

      // ============================
      // FREE PLAN
      // ============================
      async function saveUser() {
        const saveRes = await fetch("/api/save-data", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...clientData,
            planType: plan.type,
          }),
        });

        const saveData = await saveRes.json();

        if (!saveRes.ok) {
          if (saveRes.status === 409 && Array.isArray(saveData.conflicts)) {
            const dupErrors: FieldErrors = {};

            for (const field of saveData.conflicts as string[]) {
              if (
                field === "email" ||
                field === "mobile" ||
                field === "tradingViewId"
              ) {
                dupErrors[field] = `This ${FIELD_LABELS[
                  field
                ].toLowerCase()} is already registered`;
              }
            }

            setErrors(dupErrors);
          } else {
            setFormError(
              saveData.error ?? "Something went wrong. Please try again.",
            );
          }
        }

        return saveData.id;
      }

      if (!isPaid) {
        await saveUser();
        window.location.href = TELEGRAM_CHANNEL_URL;
        return;
      }

      // ============================
      // PAID PLAN
      // ============================

      if (isPaid) {
        // First creation of payment gateway
        const res = await fetch("/api/payments/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: amount,
            description: "One price. Everything unlocked.",
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const status = data.status;
          const checkoutId = data.id;
          const checkoutRef = data.checkout_reference;

          const userId = await saveUser();

          if (!userId) return;

          const payment = await fetch("/api/payments/db", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              amount: amount,
              currency: data.currency,
              checkoutId,
              checkoutReference: checkoutRef,
              status: status,
              userId,
              promoterId: normalizedPromoterId,
            }),
          });

          if (payment.ok) {
            window.location.href = data.hosted_checkout_url;
          }
        }
      }
    } catch (error) {
      console.error(error);

      setFormError(
        "Network error — please check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }



  useEffect(() => {
    if (discount?.discount) {
      const newAmount = Number((amount * (1 - discount.discount / 100)).toFixed(2));
      console.log(newAmount);
      setAmount(newAmount)
    }
  }, [discount])

  
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="grid gap-6 lg:grid-cols-[1fr_1.3fr] lg:gap-8"
    >
      {/* Order summary */}
      <div className="order-2 lg:order-1">
        <div className="sticky top-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm sm:p-8">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              isPaid
                ? "bg-cyan-500/10 text-cyan-300 ring-1 ring-inset ring-cyan-500/30"
                : "bg-slate-500/10 text-slate-300 ring-1 ring-inset ring-slate-500/30"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {isPaid ? "Paid plan" : "Free plan"}
          </span>

          <h2 className="mt-4 text-2xl font-semibold text-white">
            {plan.type}
          </h2>

          {isPaid && typeof plan.price === "number" && (
            <p className="mt-2 flex items-baseline gap-1 text-white">
              <span className="text-3xl font-bold">
                ${amount}
              </span>
              <span className={`text-sm text-slate-400`}>
              <span className="line-through font-medium text-lg">{"  "}{discount?.discount ? "₹" + plan.price.toLocaleString("en-IN") : ""} </span>/ {plan.billingCycle === "yearly" ? "year" : "month"}
              </span>
            </p>
          )}
          {
            discount?.name &&
          <p className="text-sm text-slate-400 mt-2 -mb-4 tracking-tight">Ref by <span className="text-slate-200 font-medium">{discount?.name}</span>
          </p>
          }

          <div className="mt-6 space-y-3 border-t border-white/10 pt-6 text-sm text-slate-400">
            {isPaid ? (
              <p>
                You&apos;ll be redirected to our secure payment gateway after
                this step.
              </p>
            ) : (
              <p>
                You&apos;ll get an invite link to our Telegram channel right
                after this step.
              </p>
            )}
          </div>

          {/* Contact support */}
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
            <div className="text-sm">
              <p className="font-medium text-white">Need help?</p>
              <p className="mt-0.5 text-slate-400">
                <span className="text-slate-200">Running into an issue? </span><br /> Message us on Telegram at{" "}
                <a
                  href={SUPPORT_TELEGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-cyan-300 underline underline-offset-2 hover:text-cyan-200"
                >
                  {SUPPORT_TELEGRAM_HANDLE}
                </a>{" "}
                and we&apos;ll sort it out.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="order-1 lg:order-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm sm:p-8">
          <h1 className="text-xl font-semibold text-white">Your details</h1>
          <p className="mt-1 text-sm text-slate-400">
            We use this to set up your access — no spam, ever.
          </p>

          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
            <Field
              label={FIELD_LABELS.name}
              name="name"
              value={form.name}
              onChange={(v) => updateField("name", v)}
              error={errors.name}
              placeholder="Adarsh Sharma"
              autoComplete="name"
            />

            <Field
              label={FIELD_LABELS.tradingViewId}
              name="tradingViewId"
              value={form.tradingViewId}
              onChange={(v) => updateField("tradingViewId", v)}
              onBlur={(v) => checkDuplicateOnBlur("tradingViewId", v)}
              checking={checking.tradingViewId}
              error={errors.tradingViewId}
              placeholder="your_tradingview_username"
              autoComplete="off"
            />

            {/* Mobile number — international, with country picker (India default/top) */}
            <div>
              <label
                htmlFor="mobile"
                className="mb-1.5 block text-sm font-medium text-slate-300"
              >
                {FIELD_LABELS.mobile}
              </label>
              <div className="relative">
                <PhoneInput
                  country="in"
                  preferredCountries={["in"]}
                  enableSearch
                  disableSearchIcon
                  enableLongNumbers
                  autoFormat={false}
                  value={form.mobile}
                  onChange={(value) => updateField("mobile", value)}
                  onBlur={() => checkDuplicateOnBlur("mobile", form.mobile)}
                  inputProps={{
                    id: "mobile",
                    name: "mobile",
                    autoComplete: "tel",
                    maxLength: MOBILE_MAX_LENGTH,
                    "aria-invalid": !!errors.mobile,
                    "aria-describedby": errors.mobile
                      ? "mobile-error"
                      : undefined,
                  }}
                  containerClass={`smartflow-phone-input${
                    errors.mobile ? " smartflow-phone-input--error" : ""
                  }`}
                />
                {checking.mobile && (
                  <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-500" />
                )}
                {!checking.mobile &&
                  !errors.mobile &&
                  form.mobile.trim().length > 0 && (
                    <CheckCircle2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500/70" />
                  )}
              </div>
              {errors.mobile && (
                <p id="mobile-error" className="mt-1.5 text-xs text-red-400">
                  {errors.mobile}
                </p>
              )}
            </div>

            <Field
              label={FIELD_LABELS.email}
              name="email"
              type="email"
              value={form.email}
              onChange={(v) => updateField("email", v)}
              onBlur={(v) => checkDuplicateOnBlur("email", v)}
              checking={checking.email}
              error={errors.email}
              placeholder="you@example.com"
              autoComplete="email"
            />            
            
<div className="space-y-2">
{/* <div className="space-y-2">
  <label className="text-sm font-medium">
    {FIELD_LABELS.version}
  </label>

  <CustomSelect
    value={form.version as string}
    options={versionOptions}
    placeholder="Select a version"
    error={errors.version}
    onChange={(value) => updateField("version", value)}
  />
</div> */}
  {errors.version && (
    <p className="text-sm text-destructive">
      {errors.version}
    </p>
  )}
</div>




            {isPaid && (
              <Field
                label={FIELD_LABELS.promoterId}
                name="promoterId"
                type="text"
                value={form.promoterId as string}
                onChange={(v) => updateField("promoterId", v)}
                onBlur={(v) => checkRefCode(v)}
                checking={checking.promoterId}
                error={errors.promoterId}
                placeholder="IVHQrZRDyKFs...."
                autoComplete="promoterId"
              />
            )}

            {formError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 px-6 py-3.5 text-sm font-semibold text-slate-950 transition hover:from-sky-400 hover:to-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : isPaid ? (
                "Continue to payment"
              ) : (
                "Join the Telegram channel"
              )}
            </button>
          </form>
        </div>
      </div>

      <style jsx global>{`
        .smartflow-phone-input {
          width: 100%;
        }
        .smartflow-phone-input .form-control {
          width: 100% !important;
          height: 44px !important;
          padding-left: 3.25rem !important;
          border-radius: 0.5rem !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          background-color: rgba(15, 23, 42, 0.6) !important;
          color: #fff !important;
          font-size: 0.875rem !important;
          transition:
            border-color 0.15s ease,
            box-shadow 0.15s ease;
        }
        .smartflow-phone-input .form-control::placeholder {
          color: rgb(100 116 139);
        }
        .smartflow-phone-input .form-control:focus {
          outline: none !important;
          border-color: rgba(14, 165, 233, 0.5) !important;
          box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.3) !important;
        }
        .smartflow-phone-input--error .form-control {
          border-color: rgba(239, 68, 68, 0.5) !important;
        }
        .smartflow-phone-input--error .form-control:focus {
          box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.3) !important;
        }
        .smartflow-phone-input .flag-dropdown {
          border-radius: 0.5rem 0 0 0.5rem !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-right: none !important;
          background-color: rgba(15, 23, 42, 0.6) !important;
        }
        .smartflow-phone-input .flag-dropdown:hover,
        .smartflow-phone-input .flag-dropdown.open {
          background-color: rgba(30, 41, 59, 0.9) !important;
        }
        .smartflow-phone-input .selected-flag:hover,
        .smartflow-phone-input .selected-flag:focus {
          background-color: transparent !important;
        }
        .smartflow-phone-input .country-list {
          margin-top: 4px !important;
          background-color: #0f172a !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 0.5rem !important;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4) !important;
        }
        .smartflow-phone-input .country-list .search {
          background-color: #0f172a !important;
          padding: 8px !important;
        }
        .smartflow-phone-input .country-list .search-box {
          width: 100% !important;
          margin-left: 0 !important;
          padding: 0.5rem 0.75rem !important;
          border-radius: 0.375rem !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          background-color: rgba(15, 23, 42, 0.6) !important;
          color: #fff !important;
        }
        .smartflow-phone-input .country-list .country {
          color: #e2e8f0 !important;
        }
        .smartflow-phone-input .country-list .country .dial-code {
          color: #94a3b8 !important;
        }
        .smartflow-phone-input .country-list .country:hover,
        .smartflow-phone-input .country-list .country.highlight {
          background-color: rgba(56, 189, 248, 0.12) !important;
        }
        .smartflow-phone-input .country-list .divider {
          border-bottom-color: rgba(255, 255, 255, 0.1) !important;
        }
      `}</style>
    </motion.div>
  );
}

interface FieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: (value: string) => void;
  error?: string;
  checking?: boolean;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
}

function Field({
  label,
  name,
  value,
  onChange,
  onBlur,
  error,
  checking,
  placeholder,
  type = "text",
  autoComplete,
  inputMode,
}: FieldProps) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-1.5 block text-sm font-medium text-slate-300"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => onBlur?.(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
          className={`w-full rounded-lg border bg-slate-900/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 ${
            error
              ? "border-red-500/50 focus:ring-red-500/40"
              : "border-white/10 focus:border-sky-500/50 focus:ring-sky-500/30"
          }`}
        />
        {checking && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-500" />
        )}
        {!checking && !error && value.trim().length > 0 && (
          <CheckCircle2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500/70" />
        )}
      </div>
      {error && (
        <p id={`${name}-error`} className="mt-1.5 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}