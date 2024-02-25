"use client";

import { useContext, useEffect } from "react";
import MenuContext from "./AccountSettings/Context";

import Cookies from "js-cookie";
import { useSelectedLayoutSegment } from "next/navigation";
import { usePathname } from "next/navigation";

import Link from "next/link";
import Button from "@mui/material/Button";
import AccountSettings from "./AccountSettings";

/*
function RemoveSearchParam() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get("homeRefresh")) {
      router.replace("/");
    }
  }, [searchParams, router]);
}
*/

export default function Account() {
  const { userInfo, setUserInfo } = useContext(MenuContext);
  const segment = useSelectedLayoutSegment();
  const path = usePathname();

  useEffect(() => {
    const auth = Cookies.get("authPublic");
    let claims;

    if (auth) {
      const json = atob(auth);
      claims = JSON.parse(json);
    }

    setUserInfo(claims || false);
  }, [path, setUserInfo]);

  if (userInfo === null || segment === "(auth)") {
    return null;
  }

  if (userInfo === false) {
    return (
      <>
        <Link key="login" href={thaumazoAdmin.pathName("/login")}>
          <Button color="inherit">Login</Button>
        </Link>
      </>
    );
  }

  return <AccountSettings />;
}
