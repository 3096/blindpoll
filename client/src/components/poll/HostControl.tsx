import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton, List, ListItem, ListItemText, Stack, Tooltip, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import InsertLinkIcon from '@mui/icons-material/InsertLink';
import CancelIcon from '@mui/icons-material/Cancel';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

import ErrorSnackBar from "../ErrorSnackBar";
import { PollDataForHost } from "../../common/types";
import { ApiErrorInfo, endPoll } from "../../common/api";
import { routes } from "../../routes";


export default function HostControl({ hostData, closePollCb: setPollClosedCb }:
  { hostData: PollDataForHost, closePollCb: React.Dispatch<React.SetStateAction<boolean>> }) {
  const [showList, setShowList] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [justCopied, setJustCopied] = useState(false);
  const [errorInfo, setErrorInfo] = useState<ApiErrorInfo | null>(null);

  const voteLink = useMemo(() => window.location.origin + window.location.pathname
    + "#" + routes.vote.path.replace(":id", hostData.id), [hostData.id]);
  const allAccessLinks = useMemo(
    () => hostData.accessTokens && hostData.accessTokens.map(accessToken => voteLink + "?access_token=" + accessToken).join("\n"),
    [voteLink, hostData.accessTokens]);

  const endPollCb = () => {
    endPoll({ id: hostData.id, pollHostAccessToken: hostData.pollHostAccessToken })
      .then(() => {
        setPollClosedCb(true);
      })
      .catch((err: ApiErrorInfo) => {
        setErrorInfo(err);
      });
  };

  const copyText = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => {
          setJustCopied(true);
        });
    } else {
      setErrorInfo({
        error: {
          name: "Copying is only supported with a hostname",
          message: "If you're accessing a dev build using 127.0.0.1, try using \"localhost\" instead"
        }
      });
    }
  };

  return <>
    <Accordion defaultExpanded sx={{ px: 3 }}>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls="panel1a-content"
        id="panel1a-header"
      >
        <Typography mr={3}>Host Control Options</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>
        <Stack spacing={2}>
          <Typography pl={1} variant="body1">
            Visibility: {hostData.accessTokens ? "Private" : "Public"}
          </Typography>
          {hostData.accessTokens && <Typography pl={1} variant="body1">
            Total invites available: {hostData.accessTokens.length}
          </Typography>}
          <Stack direction={'row'} spacing={2}>
            {
              hostData.accessTokens ?
                <Tooltip title="Use invite links to allow others cast a vote">
                  <Button onClick={() => setShowList(true)}><InsertLinkIcon /><Box pl={1}>View Invite Links</Box></Button>
                </Tooltip>
                :
                <Tooltip onOpen={() => setJustCopied(false)} title={justCopied ? "Copied!" : "Anyone with this link will be allowed to vote"}>
                  <Button onClick={() => copyText(voteLink)}><InsertLinkIcon /><Box pl={1}>Copy link</Box></Button>
                </Tooltip>
            }
            <Tooltip title="End the poll for everyone">
              <Button onClick={() => setShowEnd(true)}><CancelIcon /><Box pl={1}>End poll</Box></Button>
            </Tooltip>
          </Stack>
        </Stack>
      </AccordionDetails>
    </Accordion>

    <Dialog
      open={showEnd}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">
        {"End this poll?"}
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          Once the poll is closed, it cannot be reopened.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShowEnd(false)}>Cancel</Button>
        <Button color='error' onClick={endPollCb} autoFocus>
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
    {hostData.accessTokens &&
      (<Dialog
        fullWidth={true}
        open={showList}
        scroll='paper'
        aria-labelledby="scroll-dialog-title"
        aria-describedby="scroll-dialog-description"
      >
        <DialogTitle sx={{ pb: 0 }} id="scroll-dialog-title">Invite Links</DialogTitle>
        <Typography px={3} pb={2}>Each link may only be used for one vote (to prevent double voting)</Typography>
        <DialogContent dividers>
          <List dense>
            {hostData.accessTokens!.map((accessToken) => {
              const inviteLink = voteLink + "?access_token=" + accessToken;
              return (
                <ListItem key={accessToken}>
                  <ListItemText
                    primary={inviteLink}
                  />
                  <Tooltip placement="top" title={justCopied ? "Copied!" : "Copy link"} onOpen={() => setJustCopied(false)}>
                    <IconButton onClick={() => { copyText(inviteLink) }} edge="end" aria-label="delete">
                      <ContentCopyIcon />
                    </IconButton>
                  </Tooltip>
                </ListItem>)
            })}
          </List>
        </DialogContent>
        <DialogActions>
          <Tooltip placement="top" title={justCopied ? "Copied!" : "Copy all links"} onOpen={() => setJustCopied(false)}>
            <Button onClick={() => copyText(allAccessLinks!)}>Copy all</Button>
          </Tooltip>
          <Button onClick={() => setShowList(false)}>Close</Button>
        </DialogActions>
      </Dialog >)
    }
    <ErrorSnackBar errorInfo={errorInfo} />
  </>;
}
