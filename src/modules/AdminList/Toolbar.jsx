"use client";

import { useState } from "react";

// import fetchJSON from "../../../utils/fetchJSON";

import Link from "next/link";
import { usePathname } from "next/navigation";

import Title from "@kenstack/components/Title";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
// import FilterListIcon from "@mui/icons-material/FilterList";
import DeleteIcon from "@mui/icons-material/Delete";
import Badge from "@mui/material/Badge";
import Search from "./Search";
import Notice from "@kenstack/components/Notice";

import AddIcon from "@mui/icons-material/Add";
import Button from "@kenstack/forms/Button";

// import deleteAction from "./deleteAction";

import { useAdminList } from "./context";

export default function AdminListToolbar() {
  const [response, setResponse] = useState({});
  const { modelName, selected, setSelected } = useAdminList();
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
      <div className="admin-toolbar">
        <div className="admin-toolbar-left">
          <Button
            component={Link}
            href={pathName + "/new"}
            startIcon={<AddIcon />}
          >
            New
          </Button>
        </div>

        <Title modelName={modelName} />

        <div className="admin-toolbar-right">
          {selected.size > 0 ? (
            <Tooltip title={"Delete " + selected.size}>
              <IconButton onClick={handleDelete}>
                <Badge
                  sx={{
                    "& .MuiBadge-badge": {
                      marginLeft: "3px",
                      marginBottom: "3px",
                      fontSize: 9,
                      height: 15,
                      minWidth: 15,
                    },
                  }}
                  badgeContent={selected.size}
                  color="secondary"
                  anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "left",
                  }}
                >
                  <DeleteIcon />
                </Badge>
              </IconButton>
            </Tooltip>
          ) : (
            <div>
              <Search />
            </div>
          )}
        </div>
      </div>
      <Notice formState={response || {}} noScroll />
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
