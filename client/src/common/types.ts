export interface PollDataForAll {
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

export interface PollDataForHost {
    id: string,
    pollHostAccessToken: string,
    accessTokens?: string[]
}

export interface VoterSignatureData {
    id: string,
    accessToken: string,
    publicKey: string,
    privateKey: string,
    publicKeySignature: string,
}

export interface VoterRecord {
    pollId: string,
    votedOptions: string[],
}

export const accessTokenParam = 'access_token';
