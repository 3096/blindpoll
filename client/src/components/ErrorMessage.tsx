import { Box, Button, Paper, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function ErrorMessage({ statusCode: errorCode }: { statusCode: number }) {
  const [accessTokenInput, setAccessTokenInput] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Paper elevation={3} sx={{ p: 4, px: 'auto', width: 1 }}>
      {(() => {
        switch (errorCode) {
          case 401:
            return <>
              <Typography variant="h5">Looks like this poll is invite only.</Typography>
              <Typography mt={2}>Double check if you copied the URL correctly, or ask the poll creater for a unique invite link and try again?</Typography>
              <Typography mt={2}>If you are the host of this poll, make sure to use a valid invite link from the host controls to vote on this poll.</Typography>
              <Typography mt={2}>If you have an access token to this poll, please input it here:</Typography>
              <Box my={2}>
                <TextField
                  variant="outlined"
                  margin="dense"
                  fullWidth
                  label="Access Token"
                  autoComplete="off"
                  autoFocus
                  value={accessTokenInput}
                  onChange={(e) => setAccessTokenInput(e.target.value)}
                />
              </Box>
              <Button variant="contained" color="primary" onClick={() => {
                if (!accessTokenInput) return;
                const accessToken = accessTokenInput;
                setAccessTokenInput("");
                navigate(`${location.pathname}?access_token=${accessToken}`);
              }}>
                Access
              </Button>
            </>;
          case 404:
            return <>
              <Typography variant="h4" align="center">404 NOT FOUND</Typography >
              <Typography mt={1} variant="h6" align="center">maybe double check the url?</Typography >
            </>;
          case 500:
            return <Typography variant="h6" align="center">500 server no work this is so sad play despacito :(</Typography>;
          default:
            return <Typography variant="h6" align="center">errorCode</Typography>;
        }
      })()}
    </Paper >
  );
}
