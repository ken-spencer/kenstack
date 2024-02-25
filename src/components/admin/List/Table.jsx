"use client";

import styles from "../admin.module.scss";

import useAdmin from "./useAdmin";
import Error from "../Error";

import TableContainer from "@mui/material/TableContainer";
import Table from "@mui/material/Table";

import Head from "./Head";
import Body from "./Body";

export default function AdminListTable() {
  const { error } = useAdmin();
  // const [isLoaded, setIsLoaded] = useState(false);

  if (error) {
    return <Error message={error} />;
  }

  /*
  if (!isLoaded) {
    return <Loading />;
  }
  */

  return (
    <div className={styles.listBody}>
      <TableContainer>
        <Table sx={{ minWidth: 750 }} size="medium">
          <Head />
          <Body />
        </Table>
      </TableContainer>
    </div>
  );
}
