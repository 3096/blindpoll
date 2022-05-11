import config from "../config";
import { generateKeysAndBlind, rsaSha256Sign, unblindSignature } from "./crypto";

export interface ApiErrorInfo {
    error?: Error,
    info?: {
        url: string,
        status: number,
        statusText: string,
        responseBody: any,
        requestBody: any,
        response: Response,
    }
};

interface PollResponse {
    id: string,
    question: string,
    options: string[],
    votes: [{ option: string, count: number }],
    wsId: string,
    isMultipleChoice: boolean,
    isSigned: boolean,
    ended: boolean,
    publicKey?: { e: string, n: string }
}

interface PollUpdate {
    id: string,
    votes: [{ option: string, count: number }],
    ended: boolean,
}

export function getPollWebSocket(pollWsId: string, receiveUpdate?: (update: PollUpdate) => void): WebSocket {
    const ws = new WebSocket(`${config.WS_PATH}/poll/${pollWsId}`);
    if (receiveUpdate) {
        ws.onmessage = (event) => {
            const update = JSON.parse(event.data);
            receiveUpdate(update);
        };
    }
    return ws;
}

export function doFetch(method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string, bodyObj?: any, hasResponseBody: boolean = true): Promise<any> {
    return new Promise(async (resolve, reject) => {
        const options: RequestInit = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        if (bodyObj) {
            options.body = JSON.stringify(bodyObj);
        }

        let response
        try {
            response = await fetch(url, options);

        } catch (e) {
            const errorInfo: ApiErrorInfo = {
                error: e as Error,
            };
            reject(errorInfo);
            return;
        }

        if (response.ok) {
            if (hasResponseBody) {
                resolve(await response.json());
            } else {
                resolve({});
            }
        } else {
            const errorInfo: ApiErrorInfo = {
                info: {
                    url: response.url,
                    status: response.status,
                    statusText: response.statusText,
                    responseBody: response.bodyUsed ? await response.json() : undefined,
                    requestBody: bodyObj,
                    response: response,
                }
            };
            reject(errorInfo);
        }
    });
}


export async function createPoll(

    params: {
        question: string,
        options: string[],
        isMultipleChoice: boolean,
        isSigned: boolean,
        accessTokens?: string[],
        accessTokenCount?: number,
    }):

    Promise<{
        id: string,
        pollHostAccessToken: string,
        accessTokens?: string[]
    }> {

    return doFetch('POST', config.API_PATH + '/create_poll', params);
}


export async function getPoll(

    params: {
        id: string,
        accessToken?: string,
    }):

    Promise<PollResponse> {

    return doFetch('POST', config.API_PATH + '/get_poll', params);
}


export async function genKeysAndRequestSignature(

    params: {
        id: string,
        accessToken: string,
        pollPubKey: { e: string, n: string },
    }):

    Promise<{
        publicKey: string,
        privateKey: string,
        publicKeySignature: string,
    }> {

    return new Promise(async (resolve, reject) => {
        const { publicKey, privateKey, blindedPubKeyHash, blindingFactor }
            = generateKeysAndBlind(params.pollPubKey);

        doFetch('POST', config.API_PATH + '/sign_pubkey', {
            id: params.id, accessToken: params.accessToken, blindedPubKeyHash

        }).then(async ({ blindSignature }) => {
            const publicKeySignature
                = unblindSignature(blindSignature, blindingFactor, params.pollPubKey, publicKey);

            if (!publicKeySignature) {
                reject({
                    error: new Error('Failed to verify signature'),
                });
                return;
            }

            resolve({ publicKey, privateKey, publicKeySignature });

        }).catch((error) => {
            reject(error);
        });
    });
}


export async function castVote(

    params: {
        id: string,
        optionsToVoteFor: string[],
        publicKey?: string,
        privateKey?: string,
        publicKeySig?: string,
    }):

    Promise<void> {

    const message = JSON.stringify({ id: params.id, options: params.optionsToVoteFor });
    if (!params.publicKey && !params.publicKeySig) {
        return doFetch('POST', config.API_PATH + '/vote', { message }, false);
    }

    if (!params.publicKey) throw new Error('Missing public key');
    if (!params.privateKey) throw new Error('Missing private key');
    if (!params.publicKeySig) throw new Error('Missing public key signature');

    const signature = rsaSha256Sign(message, params.privateKey);

    return doFetch('POST', config.API_PATH + '/vote', {
        message, messageSig: signature, publicKey: params.publicKey, publicKeySig: params.publicKeySig
    }, false);
}


export async function endPoll(

    params: {
        id: string,
        pollHostAccessToken: string,
    }):

    Promise<void> {

    return doFetch('POST', config.API_PATH + '/end_poll', params, false);
}


export async function getPolls(

    params: {
        pollQueries: {
            id: string,
            accessToken?: string,
        }[],
    }):

    Promise<PollResponse[]> {

    return doFetch('POST', config.API_PATH + '/get_polls', params);
}
