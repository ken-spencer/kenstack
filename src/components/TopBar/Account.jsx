"use client";

import Cookies from "js-cookie";
import { useEffect, useState } from "react";
import { useSelectedLayoutSegment } from "next/navigation";
import { usePathname, useSearchParams, useRouter } from "next/navigation";

import Link from "next/link";
import Button from "@mui/material/Button";
import AccountSettings from "./AccountSettings";

export default function Account() {
  const [userInfo, setUserInfo] = useState(null);
  const segment = useSelectedLayoutSegment();
  const path = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const auth = Cookies.get("authPublic");
    setUserInfo(auth || false);
    if (searchParams.get("homeRefresh")) {
      router.replace("/");
    }
  }, [path, searchParams, router]);

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
