import { Alert, Button, Snackbar } from "@mui/material";
import { useEffect, useState } from "react";
import { ApiErrorInfo } from "../common/api";

export default function ErrorSnackBar({ errorInfo }: { errorInfo: ApiErrorInfo | null }) {
  const [showError, setShowError] = useState(false);
  const [showMoreError, setShowMoreError] = useState(false);
  useEffect(() => {
    setShowMoreError(false);
    setShowError(!!errorInfo)
  }, [errorInfo]);
  return (
    <Snackbar open={showError} >
      <Alert severity="error" sx={{ width: '100%' }} onClose={() => setShowError(false)}>
        {errorInfo && (
          showMoreError
            ? (
              (errorInfo.error?.name ? `${errorInfo.error?.name}: ${errorInfo.error.message}` : "")
              + " - " + JSON.stringify(errorInfo, undefined, 4)
            )
            : (
              errorInfo.info?.statusText
              || (
                errorInfo.error?.name && (
                  (errorInfo.error?.name === "TypeError" && "TypeError: Backend server might be down?")
                  || errorInfo.error?.name
                )
              )
              || "An error occurred"
            )
        )}
        {!showMoreError && <Button variant='text' sx={{ pt: 0, pb: 0, pr: 0 }} onClick={() => setShowMoreError(true)}>Show more</Button>}
      </Alert>
    </Snackbar>
  );
}
