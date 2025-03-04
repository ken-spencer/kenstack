"use client";

import React, { useState, useEffect } from "react";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export default function AccountMenu({
  className = "",
  buttonClass = "",
  children,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // the menu doens't toggle off usually upon logout. This will force it.
  // TODO Recheck if needed in next.js 15 as it caches less aggressivly.
  useEffect(() => {
    if (searchParams.get("logout")) {
      router.replace(pathname);
      router.refresh();
    }
  }, [searchParams, router, pathname]);

  useEffect(() => {
    if (isOpen === false) {
      return;
    }

    const keyDown = (evt) => {
      if (evt.key === "Escape") {
        setIsOpen(false);
      }
    };

    const click = (evt) => {
      setIsOpen(false);
    };

    window.addEventListener("keydown", keyDown);
    document.addEventListener("click", click);

    return () => {
      window.removeEventListener("keydown", keyDown);
      document.removeEventListener("click", click);
    };
  }, [isOpen]);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div
      className={
        "account-menu-cont" + (isOpen ? " is-open" : "") + ` ${className}`
      }
    >
      <button
        className={buttonClass}
        onClick={toggleMenu}
        aria-haspopup="true"
        aria-expanded={isOpen ? "true" : "false"}
      >
        <span>My account</span>
        <svg
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      <div
        className="account-menu"
        role="menu"
        aria-orientation="vertical"
        aria-labelledby="menu-button"
      >
        {children}
      </div>
    </div>
  );
}
