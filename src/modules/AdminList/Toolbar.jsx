"use client";

import { useState } from "react";

// import fetchJSON from "../../../utils/fetchJSON";

import Link from "next/link";
import { usePathname } from "next/navigation";

import Title from "@kenstack/components/Title";
import DeleteIcon from "@mui/icons-material/Delete";
import Search from "./Search";
import Notice from "@kenstack/components/Notice";

import AddIcon from "@heroicons/react/24/outline/PlusIcon";
import Button from "@kenstack/forms/Button";

// import deleteAction from "./deleteAction";

import { useAdminList } from "./context";

export default function AdminListToolbar() {
  const [response, setResponse] = useState({});
  const { modelName, selected, setSelected, admin } = useAdminList();
  const pathName = usePathname();

  const handleDelete = () => {
    setResponse("TODO, bring this feature back online");
    setSelected(new Set()); // for linting, remove when able.

    /*
    deleteAction({ modelName, selected })
      .then((res) => {
        setResponse(res);
        // handleLoad(); // load remaining rows
        setSelected(new Set());
      })
      .catch((e) => {
        setResponse({
          error:
            "There was an unexpected problem with your request. Please try again later",
        });
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.error(e);
        }
      });
      */
  };

  return (
    <>
      <div className="flex rounder border border-gray-500 rounded p-1 mb-2">
        <div className="">
          <Button
            component={Link}
            href={pathName + "/new"}
            startIcon={<AddIcon />}
          >
            New
          </Button>
        </div>

        <div className="flex-1 text-center">{admin.title}</div>

        <div className="text-right w-64">
          {selected.size > 0 ? (
            <Button
              type="button"
              onClick={handleDelete}
              // disabled={isNew || id === userId}
              variant="contained"
              startIcon={<DeleteIcon />}
            >
              Delete {selected.size}
            </Button>
          ) : (
            <div>
              <Search />
            </div>
          )}
        </div>
      </div>
      <Notice actionState={response || {}} noScroll collapse />
    </>
  );
}
/*
<Tooltip title="Filter list">
  <IconButton>
    <FilterListIcon />
  </IconButton>
</Tooltip>

*/
