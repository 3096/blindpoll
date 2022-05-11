import { Backdrop, Box, CircularProgress, Divider, List, ListItem, ListItemButton, Tab, Tabs, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { NavigateFunction, useNavigate } from "react-router-dom";

import datastore from "../common/localstorage";
import ErrorSnackBar from "../components/ErrorSnackBar";
import { ApiErrorInfo, getPolls } from "../common/api";
import { PollDataForAll } from "../common/types";
import { routes } from "../routes";

function PollList({ polls, navigate }:
  { polls: { id: string, question: string, isHost?: true, accessToken?: string }[], navigate: NavigateFunction }) {
  return (polls.length
    ? <List>
      {polls.map(pollInfo => <div key={pollInfo.id}>
        <Divider />
        <ListItem>
          <ListItemButton onClick={() => {
            navigate((pollInfo.isHost ? routes.view.path : routes.vote.path).replace(':id', pollInfo.id)
              + (pollInfo.accessToken ? `?access_token=${pollInfo.accessToken}` : ''));
          }}>
            {pollInfo.question}
          </ListItemButton>
        </ListItem>
      </div>)}
      < Divider />
    </List>
    : <ListItem>
      <Typography>No polls found</Typography>
    </ListItem>
  );
}

export default function Browse() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [errorInfo, setErrorInfo] = useState<ApiErrorInfo | null>(null);

  const [pollDataLists, setPollDataLists] = useState<PollDataForAll[][]>([[], [], []]);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedIdx(newValue);
  };

  useEffect(() => {
    (async () => {
      const hostData = datastore.hostData.read();
      const voterRecords = datastore.voterRecords.read();
      const voterAccessTokenRecords = Object.fromEntries(
        Object.values(datastore.voterSigData.read()).map(sigData => [sigData.id, sigData.accessToken])
      );
      try {
        const hostDataValues = Object.values(hostData);
        const voterRecordsValues = Object.values(voterRecords);
        return [
          hostDataValues.length ? (await getPolls({
            pollQueries: hostDataValues.map(hostData => ({
              id: hostData.id, accessToken: hostData.pollHostAccessToken
            }))
          })).map(poll => ({ ...poll, isHost: true, accessToken: hostData[poll.id].pollHostAccessToken })) : [],
          voterRecordsValues.length ? (await getPolls({
            pollQueries: voterRecordsValues.map(v => ({
              id: v.pollId, accessToken: voterAccessTokenRecords[v.pollId],
            }))
          })).map(poll => ({ ...poll, accessToken: voterAccessTokenRecords[poll.id] })) : [],
          await getPolls({ pollQueries: [] }),
        ];

      } catch (e) {
        setErrorInfo(e as ApiErrorInfo);
        return [[], [], []];
      }
    })().then((pollDataLists) => {
      setPollDataLists(pollDataLists)
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return <Backdrop
      sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
      open={isLoading}
    >
      <CircularProgress color="inherit" />
    </Backdrop>
  }

  return (
    <>
      <Box sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs centered value={selectedIdx} onChange={handleChange}>
            <Tab label="Created by me" />
            <Tab label="Voted on by me" />
            <Tab label="Public polls" />
          </Tabs>
        </Box>

        <Typography mt={3}>Ongoing</Typography>
        <PollList polls={pollDataLists[selectedIdx].filter(pollData => !pollData.ended)} navigate={navigate} />

        <Typography mt={3}>Ended</Typography>
        <PollList polls={pollDataLists[selectedIdx].filter(pollData => pollData.ended)} navigate={navigate} />

      </Box>

      <ErrorSnackBar errorInfo={errorInfo} />
    </>
  );
}
