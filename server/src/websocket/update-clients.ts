import MultipathServer from 'ws-multipath';
import WebSocket, { WebSocketServer } from 'ws';

import Poll from '../models/poll';
import config from '../config';

console.log(`WebSocket server using port ${config.WS_PORT}`);
const wss = new MultipathServer({ port: config.WS_PORT });

const openPollSocketServers: { [wsId: string]: WebSocketServer } = {};

Poll.find({ ended: false }).then(polls => polls.forEach(openPoll));

export function openPoll(poll: any) {
    const path = `${config.WS_ROUTE}/poll/${poll.wsId}`;
    const socketServer: WebSocketServer = wss.createHandler({ path: `${config.WS_ROUTE}/poll/${poll.wsId}` });
    openPollSocketServers[poll.wsId] = socketServer;
}

export function sendPollUpdate(poll: any) {
    if (openPollSocketServers[poll.wsId]) {
        const updateMsg = JSON.stringify({
            id: poll.wsId,
            votes: poll.votes,
            ended: poll.ended
        });
        openPollSocketServers[poll.wsId].clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(updateMsg);
            }
        });
    }
}

export function closePoll(poll: any) {
    sendPollUpdate(poll);
    setTimeout(() => {
        if (openPollSocketServers[poll.wsId]) {
            openPollSocketServers[poll.wsId].close();
            delete openPollSocketServers[poll.wsId];
        }
    }, 10000);  // idk if queued msgs will be sent after calling close, so wait a bit to be safe...
}
