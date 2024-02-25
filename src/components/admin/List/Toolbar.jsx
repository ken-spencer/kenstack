"use client";

import { useState } from "react";

// import fetchJSON from "../../../utils/fetchJSON";

import styles from "../admin.module.scss";

import Link from "next/link";
import { usePathname } from "next/navigation";

import Title from "../Title";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
// import FilterListIcon from "@mui/icons-material/FilterList";
import DeleteIcon from "@mui/icons-material/Delete";
import Badge from "@mui/material/Badge";
import Search from "./Search";
import Notice from "../Notice";

import AddIcon from "@mui/icons-material/Add";
import Button from "@thaumazo/forms/Button";

import deleteAction from "./deleteAction";

import useAdmin from "./useAdmin";

export default function AdminListToolbar() {
  const [response, setResponse] = useState({});
  const { modelName, selected, handleLoad, setSelected } = useAdmin();
  const pathName = usePathname();

  const handleDelete = () => {
    /*
    fetchJSON(thaumazoAdmin.pathName("/api/list-delete"), {
      modelName,
      selected: [...selected],
    })
    */

    deleteAction({ modelName, selected })
      .then((res) => {
        setResponse(res);
        handleLoad(); // load remaining rows
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
  };

  return (
    <>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <Button
            component={Link}
            href={pathName + "/new"}
            startIcon={<AddIcon />}
          >
            New
          </Button>
        </div>

        <Title modelName={modelName} />

        <div className={styles.toolbarRight}>
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
