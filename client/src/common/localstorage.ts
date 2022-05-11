import { PollDataForHost, VoterSignatureData, VoterRecord } from "./types";

function read<T>(key: string): { [id: string]: T } {
    const valueStr = localStorage.getItem(key);
    return valueStr ? JSON.parse(valueStr) : {};
}

function store<T>(key: string, id: string, value: T) {
    let data = read<T>(key);
    data[id] = value;
    localStorage.setItem(key, JSON.stringify(data));
}

const datastore = {
    hostData: {
        read: () => read<PollDataForHost>('hostData'),
        store: (id: string, value: PollDataForHost) => store<PollDataForHost>('hostData', id, value),
    },
    voterSigData: {
        read: () => read<VoterSignatureData>('voterSigData'),
        store: (access_token: string, value: VoterSignatureData) => store<VoterSignatureData>('voterSigData', access_token, value),
    },
    voterRecords: {
        read: () => read<VoterRecord>('voterRecords'),
        store: (id: string, value: VoterRecord) => store<VoterRecord>('voterRecords', id, value),
    },
};

export default datastore;
