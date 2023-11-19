"use client";

import { useContext } from "react";
import MenuContext from "./AccountSettings/Context";

import Cookies from "js-cookie";
import { useEffect } from "react";
import { useSelectedLayoutSegment } from "next/navigation";
import { usePathname, useSearchParams, useRouter } from "next/navigation";

import Link from "next/link";
import Button from "@mui/material/Button";
import AccountSettings from "./AccountSettings";

export default function Account() {
  const { userInfo, setUserInfo } = useContext(MenuContext);
  const segment = useSelectedLayoutSegment();
  const path = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const auth = Cookies.get("authPublic");
    let claims;

    if (auth) {
      const json = atob(auth);
      claims = JSON.parse(json);
    }

    setUserInfo(claims || false);
    if (searchParams.get("homeRefresh")) {
      router.replace("/");
    }
  }, [path, searchParams, router, setUserInfo]);

  if (userInfo === null || segment === "(auth)") {
    return null;
  }

  if (userInfo === false) {
    return (
      <Link key="login" href="/login">
        <Button color="inherit">Login</Button>
      </Link>
    );
  }

  return <AccountSettings />;
}
