"use client";

import { signIn } from "next-auth/react";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    onTelegramAuth?: (user: Record<string, string | number>) => void;
  }
}

export function TelegramLogin({ botUsername }: { botUsername: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!botUsername || !ref.current) return;

    window.onTelegramAuth = (user) => {
      void signIn("telegram", {
        ...Object.fromEntries(
          Object.entries(user).map(([k, v]) => [k, String(v)]),
        ),
        callbackUrl: "/for-you",
      });
    };

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "0");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    ref.current.innerHTML = "";
    ref.current.appendChild(script);

    return () => {
      delete window.onTelegramAuth;
    };
  }, [botUsername]);

  if (!botUsername) {
    return (
      <p className="muted">
        Telegram login needs <code>TELEGRAM_BOT_USERNAME</code> configured.
      </p>
    );
  }

  return <div ref={ref} className="telegram-login" />;
}
