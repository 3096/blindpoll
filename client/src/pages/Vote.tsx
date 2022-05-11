import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import {
  Button, Grid, List, ListItem, ListItemButton, ListItemIcon, Checkbox, ListItemText,
  Radio, Stack, Snackbar, Alert, Divider, ButtonGroup, Popper, Grow, Paper, ClickAwayListener, MenuItem, MenuList,
  Tooltip, Box, Backdrop, CircularProgress
} from '@mui/material';

import ErrorMessage from '../components/ErrorMessage';
import { routes } from '../routes';
import { usePollId, useVoterAccessToken, usePollData } from '../hooks/byohooks';
import PollQuestion from '../components/poll/PollQuestion';
import { ApiErrorInfo, castVote, genKeysAndRequestSignature } from '../common/api';
import datastore from '../common/localstorage';
import ErrorSnackBar from '../components/ErrorSnackBar';
import { VoterSignatureData } from '../common/types';

export default function Vote() {
  const { search } = useLocation();
  const navagate = useNavigate();

  const [voteButtonGroupIsOpen, setVoteButtonGroupIsOpen] = useState(false);
  const voteButtonGroupAnchorRef = useRef<HTMLDivElement>(null);
  const [voteButtonGroupSelectedIndex, setVoteButtonGroupSelectedIndex] = useState(0);
  const [errorInfo, setErrorInfo] = useState<ApiErrorInfo | null>(null);

  const options = ['Vote now', 'Vote later'];

  const id = usePollId();
  const accessToken = useVoterAccessToken();
  const [pollData, pollDataStatusCode] = usePollData(id, accessToken, false);
  const [voteOptions, setVoteOptions] = useState([] as string[]);
  const [voterSigData, setVoterSigData] = useState<VoterSignatureData | null>(
    accessToken ? datastore.voterSigData.read()[accessToken] : null
  );
  const [signSuccessSnackbarOpen, setSignSuccessSnackbarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const gotoViewThisPoll = useCallback((isRedirect: boolean = false) => {
    navagate(routes.view.path.replace(':id', id) + search, { replace: isRedirect });
  }, [id, navagate, search]);

  useEffect(() => {
    if (datastore.voterRecords.read()[id] && (!accessToken || datastore.voterSigData.read()[accessToken])) {
      gotoViewThisPoll(true);
    }
  }, [gotoViewThisPoll, accessToken, id]);

  const requestSignature = () => {
    if (!pollData || !pollData.isSigned || !accessToken || !pollData.publicKey) {
      throw new Error(`precondition failed: pollData.isSigned=${pollData?.isSigned}, accessToken=${accessToken}, pollData.publicKey=${pollData?.publicKey}`);
    }
    genKeysAndRequestSignature({
      id: pollData.id, accessToken, pollPubKey: pollData.publicKey
    }).then(({ publicKey, privateKey, publicKeySignature }) => {
      const voterData = { id, accessToken, publicKey, privateKey, publicKeySignature };
      datastore.voterSigData.store(accessToken, voterData);
      setSignSuccessSnackbarOpen(true);
      setVoterSigData(voterData);

    }).catch((err: ApiErrorInfo) => {
      if (err.info?.status === 403) {
        err.info.statusText = 'This invite link has already been used.';
      }
      setErrorInfo(err);
    });
  };

  const onVoteSucceeded = () => {
    datastore.voterRecords.store(id, { pollId: id, votedOptions: voteOptions });
    setIsLoading(false);
    gotoViewThisPoll();
  };
  const onVoteFailed = (err: ApiErrorInfo) => {
    setIsLoading(false);
    setErrorInfo(err);
  };

  const sendVoteIn = () => {
    // todo: based on the signed/vs unsigned/vs sign on fly status, break up this function so it's not a mess

    if (!pollData) {
      throw new Error('precondition failed: pollData');
    }

    let { id, publicKey, privateKey, publicKeySignature } = voterSigData ? voterSigData
      : { id: pollData?.id, publicKey: undefined, privateKey: undefined, publicKeySignature: undefined };

    if (pollData.isSigned && !voterSigData) {
      if (!accessToken || !pollData.publicKey) {
        throw new Error(`precondition failed: accessToken=${accessToken}, pollData.publicKey=${pollData?.publicKey}`);
      }
      setIsLoading(true);
      genKeysAndRequestSignature({
        id: pollData.id, accessToken, pollPubKey: pollData.publicKey
      }).then((signatureResponse) => {
        const voterSigData = { id, accessToken, ...signatureResponse };
        datastore.voterSigData.store(accessToken, voterSigData);

        castVote({
          id, optionsToVoteFor: voteOptions, publicKey: signatureResponse.publicKey,
          privateKey: signatureResponse.privateKey, publicKeySig: signatureResponse.publicKeySignature
        }).then(onVoteSucceeded).catch(onVoteFailed);

      }).catch((err: ApiErrorInfo) => {
        if (err.info?.status === 403) {
          err.info.statusText = 'This invite link has already been used.';
        }
        setIsLoading(false);
        setErrorInfo(err);
      });
      return;
    }

    setIsLoading(true);
    castVote({
      id, optionsToVoteFor: voteOptions, publicKey, privateKey, publicKeySig: publicKeySignature
    }).then(onVoteSucceeded).catch(onVoteFailed);
  };

  const handleToggle = useCallback((option: string) => {
    if (pollData?.isMultipleChoice) {
      if (voteOptions.includes(option)) {
        setVoteOptions(voteOptions.filter((o) => o !== option));
      } else {
        setVoteOptions([...voteOptions, option]);
      }
    } else {
      setVoteOptions([option]);
    }
  }, [pollData?.isMultipleChoice, voteOptions]);

  const handleVoteButtonGroupPopperClick = (
    event: React.MouseEvent<HTMLLIElement, MouseEvent>,
    index: number,
  ) => {
    setVoteButtonGroupSelectedIndex(index);
    setVoteButtonGroupIsOpen(false);
  };

  const closeVoteButtonGroup = (event: Event) => {
    if (
      voteButtonGroupAnchorRef.current &&
      voteButtonGroupAnchorRef.current.contains(event.target as HTMLElement)
    ) {
      return;
    }

    setVoteButtonGroupIsOpen(false);
  };

  // if already voted or poll has ended, redirect to view poll
  useEffect(() => {
    if (pollData?.ended) {
      gotoViewThisPoll(true);
    }
  }, [gotoViewThisPoll, pollData]);

  if (pollDataStatusCode / 100 >= 4) {
    return <ErrorMessage statusCode={pollDataStatusCode} />
  }

  if (!pollData) {
    return <></>;
  }

  const voteIsEmpty = !voteOptions.length;
  const needToSignKey = pollData.isSigned && !voterSigData?.publicKeySignature;

  return (
    <>
      <PollQuestion isPublic={!pollData.isSigned} question={pollData.question} />

      <Grid container>
        <Grid item xs={12}>
          <List>
            {pollData.options.map(option => (
              <div key={option}>
                <Divider />
                <ListItem disablePadding>
                  <ListItemButton role={undefined} onClick={() => handleToggle(option)} dense>
                    <ListItemIcon>
                      {pollData.isMultipleChoice ?
                        <Checkbox edge="start" checked={voteOptions.includes(option)} tabIndex={-1} disableRipple /> :
                        <Radio edge="start" checked={voteOptions.includes(option)} tabIndex={-1} disableRipple />
                      }
                    </ListItemIcon>
                    <ListItemText primary={option} />
                  </ListItemButton>
                </ListItem>
              </div>
            ))}
            <Divider />
          </List>

          <Box mt={2} />

          <Stack direction={'row'} spacing={2}>

            {/*  */}
            <ButtonGroup variant="contained" ref={voteButtonGroupAnchorRef}
              aria-label="split button">

              {(voteButtonGroupSelectedIndex === 0 || !(needToSignKey)) &&
                <Tooltip title='Select an option to vote for first' placement="top"
                  disableFocusListener={!voteIsEmpty}
                  disableHoverListener={!voteIsEmpty}
                  disableTouchListener={!voteIsEmpty}>
                  <span>
                    <Button
                      variant="contained"
                      color="primary"
                      disabled={voteIsEmpty}
                      sx={needToSignKey ? { borderTopRightRadius: 0, borderBottomRightRadius: 0, } : {}}
                      onClick={() => {
                        sendVoteIn();
                      }}
                    >
                      {needToSignKey ? "Vote now" : "Vote"}
                    </Button>
                  </span>
                </Tooltip>
              }

              {(voteButtonGroupSelectedIndex === 1 && needToSignKey) &&
                <>
                  <Tooltip title={
                    'Ask the poll server to sign our public key now, but we can use it for voting at a later time. '
                    + 'This will allow you to come back to vote with a different IP at a different time, making it '
                    + 'much harder to trace the vote back to you.'
                  } placement="top">
                    <Button
                      onClick={requestSignature}>
                      {options[voteButtonGroupSelectedIndex]}
                    </Button>
                  </Tooltip>
                </>
              }

              {needToSignKey &&
                <Button
                  size="small"
                  aria-controls={voteButtonGroupIsOpen ? 'split-button-menu' : undefined}
                  aria-expanded={voteButtonGroupIsOpen ? 'true' : undefined}
                  aria-label="select vote strategy"
                  aria-haspopup="menu"
                  sx={{
                    borderTopLeftRadius: 0,
                    borderBottomLeftRadius: 0,
                  }}
                  onClick={() => {
                    setVoteButtonGroupIsOpen((prevOpen) => !prevOpen);
                  }}
                >
                  <ArrowDropDownIcon />
                </Button>
              }
            </ButtonGroup>
            <Popper
              open={voteButtonGroupIsOpen}
              anchorEl={voteButtonGroupAnchorRef.current}
              transition
              disablePortal
            >
              {({ TransitionProps, placement }) => (
                <Grow
                  {...TransitionProps}
                  style={{ transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom', }}
                >
                  <Paper>
                    <ClickAwayListener onClickAway={closeVoteButtonGroup}>
                      <MenuList id="split-button-menu" autoFocusItem>
                        {options.map((option, index) => (
                          <MenuItem
                            key={option}
                            selected={index === voteButtonGroupSelectedIndex}
                            onClick={(event) => handleVoteButtonGroupPopperClick(event, index)}
                          >
                            {option}
                          </MenuItem>
                        ))}
                      </MenuList>
                    </ClickAwayListener>
                  </Paper>
                </Grow>
              )}
            </Popper>

            <Button
              variant="contained"
              color="secondary"
              onClick={() => gotoViewThisPoll()}
            >
              See results
            </Button>

          </Stack >
        </Grid>
      </Grid >

      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={isLoading}
      >
        <CircularProgress color="inherit" />
      </Backdrop>

      <Snackbar open={signSuccessSnackbarOpen} autoHideDuration={6000} onClose={() => { }}>
        <Alert onClose={() => setSignSuccessSnackbarOpen(false)} severity="success" sx={{ width: '100%' }}>
          Successfully requested blind signature! Don't forget to cast your vote later
        </Alert>
      </Snackbar>
      <ErrorSnackBar errorInfo={errorInfo} />
    </>
  );
}
