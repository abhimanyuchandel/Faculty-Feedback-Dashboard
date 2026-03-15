"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      type="button"
      className="btn ghost"
      onClick={() => {
        void (async () => {
          await signOut({ redirect: false });
          window.location.assign("/search");
        })();
      }}
    >
      Sign out
    </button>
  );
}
