"use client";

import Link from "next/link";

export default function PaymentFailedPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-neutral-950 px-6">
      {/* Animated SVG Background */}
      <svg
        className="absolute inset-0 h-full w-full opacity-20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="18%"
          cy="22%"
          r="90"
          fill="none"
          stroke="#ef4444"
          strokeWidth="2"
          className="animate-pulse"
        />
        <circle
          cx="82%"
          cy="72%"
          r="120"
          fill="none"
          stroke="#dc2626"
          strokeWidth="2"
          className="animate-[pulse_5s_ease-in-out_infinite]"
        />
        <circle
          cx="55%"
          cy="12%"
          r="45"
          fill="none"
          stroke="#f87171"
          strokeWidth="2"
          className="animate-bounce"
        />
      </svg>

      {/* Floating Dots */}
      <div className="absolute left-20 top-24 h-4 w-4 animate-bounce rounded-full bg-red-500" />
      <div className="absolute right-24 top-32 h-3 w-3 animate-ping rounded-full bg-red-400" />
      <div className="absolute bottom-24 left-1/4 h-5 w-5 animate-pulse rounded-full bg-red-600" />
      <div className="absolute bottom-32 right-20 h-4 w-4 animate-bounce rounded-full bg-red-500" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-lg rounded-3xl border border-neutral-800 bg-neutral-900 p-10 shadow-2xl">
        {/* Animated Error Icon */}
        <div className="mx-auto mb-8 flex h-28 w-28 items-center justify-center rounded-full border-4 border-red-500">
          <svg
            className="h-16 w-16 animate-[pop_0.7s_ease]"
            viewBox="0 0 64 64"
            fill="none"
          >
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="#ef4444"
              strokeWidth="2"
              strokeDasharray="180"
              strokeDashoffset="180"
            >
              <animate
                attributeName="stroke-dashoffset"
                values="180;0"
                dur="0.7s"
                fill="freeze"
              />
            </circle>

            <path
              d="M22 22L42 42M42 22L22 42"
              stroke="#ef4444"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="60"
              strokeDashoffset="60"
            >
              <animate
                attributeName="stroke-dashoffset"
                values="60;0"
                begin="0.5s"
                dur="0.4s"
                fill="freeze"
              />
            </path>
          </svg>
        </div>

        {/* Heading */}
        <h1 className="text-center text-4xl font-bold text-white">
          Payment Failed
        </h1>

        <p className="mt-5 text-center leading-7 text-neutral-400">
          Unfortunately, we couldn&apos;t verify your payment.
          <br />
          If you believe the payment was successful or money was deducted,
          please report it to our Telegram support with your payment screenshot.
        </p>

        {/* Buttons */}
        <div className="mt-10 space-y-4">
          <Link
            href={process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_URL || "https://t.me/smartflowalgo"}
            target="_blank"
            className="flex h-14 w-full items-center justify-center rounded-xl bg-red-500 text-lg font-semibold text-white transition-all duration-300 hover:scale-[1.03] hover:bg-red-600 active:scale-95"
          >
            Report on Telegram
          </Link>

        </div>

        <div className="mt-6 rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-center">
          <p className="text-sm text-red-300">
            💡 <strong>Need help?</strong>
            <br />
            Send your payment screenshot and transaction ID on Telegram. Our
            support team will review your payment as quickly as possible.
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes pop {
          0% {
            transform: scale(0);
          }
          70% {
            transform: scale(1.15);
          }
          100% {
            transform: scale(1);
          }
        }
      `}</style>
    </main>
  );
}