import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Typography, List, ListItem, ListItemText, Divider, Stack, Paper, Grid } from '@mui/material';

import datastore from '../common/localstorage';
import ErrorMessage from '../components/ErrorMessage';
import { getPollWebSocket } from '../common/api';
import { usePollId, useVoterAccessToken, usePollData } from '../hooks/byohooks';
import PollQuestion from '../components/poll/PollQuestion';
import HostControl from '../components/poll/HostControl';
import { PollDataForAll } from '../common/types';
import { useTheme } from '@mui/system';

export default function ViewPoll() {
  const id = usePollId();
  const accessToken = useVoterAccessToken();
  const theme = useTheme();

  const [votes, setVotes] = useState([] as { option: string, count: number }[]);
  const [pollHasEnded, setPollHasEnded] = useState(false);
  const [pollData, pollDataStatusCode] = usePollData(id, accessToken, true,
    useCallback((pollData: PollDataForAll) => {
      setVotes(pollData.votes.sort((a, b) => b.count - a.count));
      setPollHasEnded(pollData.ended);
    }, []));

  const webSocketRef = useRef<WebSocket | undefined>(undefined);

  const hostData = useMemo(() => datastore.hostData.read(), []);
  const voterRecord = useMemo(() => datastore.voterRecords.read()[id], [id]);

  useEffect(() => {
    if (webSocketRef.current) {
      webSocketRef.current.close();
    }

    if (pollHasEnded || !pollData || pollData.ended) {
      webSocketRef.current = undefined;
      return;
    }

    const interval = setInterval(() => {
      if (!webSocketRef.current || webSocketRef.current.readyState !== WebSocket.OPEN) {
        // todo: switch to a socket library for better reliability, considering socket.io
        webSocketRef.current = getPollWebSocket(pollData.wsId, (data) => {
          setVotes(data.votes.sort((a, b) => b.count - a.count));
          setPollHasEnded(data.ended);
        });
      }
    }, 500);
    return () => clearInterval(interval);
  }, [pollData, pollHasEnded]);

  if (pollDataStatusCode / 100 >= 4) {
    return <ErrorMessage statusCode={pollDataStatusCode} />
  }

  if (!pollData) {
    return <></>;
  }

  const isHost = !pollHasEnded && id in hostData;

  return (
    <>
      <Grid container>
        <Grid item xs={12}>
          <Stack spacing={2}>
            <PollQuestion isPublic={!pollData.isSigned} question={pollData.question} />

            {isHost && <HostControl hostData={hostData[id]} closePollCb={setPollHasEnded} />}

            {pollHasEnded && <Paper><Typography variant="h5" align="center">This poll has ended</Typography></Paper>}

            <Stack direction='row' spacing={1}>
              <Typography variant="h6" >Poll Results</Typography>
              <Paper sx={{ px: 1, "lineHeight": 2 }}>{pollHasEnded ? "Final" : "Live"}</Paper>
            </Stack>

            <List>
              {votes.map(({ option, count }) =>
                <div key={option}>
                  <Divider />
                  <ListItem sx={
                    voterRecord && voterRecord.votedOptions.includes(option) ?
                      { border: 'solid', borderColor: theme.palette.primary.main, borderRadius: 2 } : {}
                  }>
                    <ListItemText primary={option} secondary={`${count} ${count > 1 ? "votes" : "vote"}`} />
                  </ListItem>
                </div>)}
              <Divider />
            </List>
          </Stack>
        </Grid>
      </Grid >
    </>
  );
}
