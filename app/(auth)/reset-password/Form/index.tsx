"use client"
// import Link from 'next/link';
import Cookies from "js-cookie"
import { useCallback, useEffect, useState } from "react"

import { ThemeProvider, Form, TextField, Submit } from "@thaumazo/forms"
import Alert from '@mui/material/Alert';
import Fade from '@mui/material/Fade';

// import AlertTitle from '@mui/material/AlertTitle';

import styles from "./form.module.css"

export default function LoginForm() {
  const [error, setError] = useState();
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const error = Cookies.get('error')
    if (error) {
      setError(error);
      Cookies.remove('error')
    }
    
  }, [])

  const handleSubmit = useCallback((evt, {reset, values}) => {
    setSuccess();
    setError();
    fetch("/forgotten-password/api", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(values),
    })
    .then(async res => {
      if (res.headers.get('content-type') != "application/json") {
        setError('The response we recieverd was invalid. Please try again later');
        console.error("Recieved: " + res.headers.get('content-type'));
        return; 
      }

      const json = await res.json()
      const { type, message } = json

      if (type === "success") {
        setSuccess(message)
        reset();
      } else {
        setError(message);
      }
    })
    .catch((e) => {
      console.error(e);
      setError('There was a problem handling your request. Please try again later');
    });



  }, []);

  return (
    <ThemeProvider theme="auto">
      <Form onSubmit={ handleSubmit } className={ styles.container }>
        <div className={ styles.item }>
          <p>
            Type your new password here. Make sure it has at least 8 symbols. It should have 
            both big and small letters and also a number.
          </p>
        </div>

      { success && (
         <div className={ styles.errorItem }>
            <Fade in={true}><Alert severity="success">{ success }</Alert></Fade>
         </div>
       )}
       { (error && !success) && (
         <div className={ styles.errorItem }>
            <Fade in={true}><Alert severity="error">{ error }</Alert></Fade>
         </div>
        )}    

        <div className={ styles.item }>
          <TextField
            name="password"
            type="password"
            required
            pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$"
          />
        </div>

        <div className={ styles.item }>
          <TextField
            name="confirmPassword"
            type="password"
            required 
          />
        </div>
        <div className={ styles.item }>
          <Submit fullWidth>Request link</Submit>
        </div>
      </Form>
    </ThemeProvider>
  )
}
