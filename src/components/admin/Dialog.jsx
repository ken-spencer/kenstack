import * as React from "react";
import { styled } from "@mui/material/styles";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import Typography from "@mui/material/Typography";

const BootstrapDialog = styled(Dialog)(({ theme }) => ({
  "& .MuiDialogContent-root": {
    padding: theme.spacing(2),
  },
  "& .MuiDialogActions-root": {
    padding: theme.spacing(1),
  },
}));

export default function AdminDialogs({
  fullWidth,
  maxWidth,
  open,
  close,
  title = "",
  actions,
  children,
}) {
  const [isOpen, setIsOpen] = React.useState(false);

  /*
  const handleClickOpen = () => {
    setOpen(true);
  };
  */

  const handleClose = () => {
    if (close) {
      close();
    } else if (open === undefined) {
      setIsOpen(false);
    }
  };

  return (
    <React.Fragment>
      <BootstrapDialog
        fullWidth={fullWidth}
        maxWidth={maxWidth}
        onClose={handleClose}
        aria-labelledby="customized-dialog-title"
        open={open !== undefined ? open : isOpen}
      >
        <DialogTitle sx={{ m: 0, p: 2 }} id="customized-dialog-title">
          {title}
        </DialogTitle>
        {close && (
          <IconButton
            aria-label="close"
            onClick={handleClose}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        )}
        <DialogContent dividers>
          <Typography gutterBottom component="div">
            {children}
          </Typography>
        </DialogContent>
        <DialogActions>{actions}</DialogActions>
      </BootstrapDialog>
    </React.Fragment>
  );
}
