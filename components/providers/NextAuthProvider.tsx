"use client";

import { SessionProvider, signOut, useSession } from "next-auth/react";
import React, { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

function SessionGuard() {
  const { status } = useSession();
  const router = useRouter();
  const wasAuthenticated = useRef(false);

  useEffect(() => {
    if (status === "authenticated") wasAuthenticated.current = true;
    if (status === "unauthenticated" && wasAuthenticated.current) {
      wasAuthenticated.current = false;
      void signOut({ callbackUrl: "/login?session=replaced" });
      router.replace("/login?session=replaced");
    }
  }, [status, router]);

  return null;
}

export default function NextAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider refetchInterval={30}>
      <SessionGuard />
      {children}
    </SessionProvider>
  );
}
