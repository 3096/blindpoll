import { useState, useEffect, Dispatch } from "react";
import { useParams, useLocation } from "react-router-dom";

import datastore from "../common/localstorage";
import { getPoll, ApiErrorInfo } from "../common/api";
import { PollDataForAll, accessTokenParam } from "../common/types";

export function usePollId() {
    let { id } = useParams();
    if (!id) {
        throw new Error('How did you get here?');
    }
    return id;
}

export function useVoterAccessToken() {
    const getAccessTokenFromSearch = (search: string) => new URLSearchParams(search).get(accessTokenParam);

    const { search } = useLocation();

    return getAccessTokenFromSearch(search);
}

export function usePollData(id: string, voterAccessToken: string | null, allowHostAccessToken: boolean,
    onSuccess?: (pollData: PollDataForAll) => void): [PollDataForAll | null, number] {

    const [pollData, setPollData] = useState<PollDataForAll | null>(null);
    const [pollDataStatusCode, setPollDataStatusCode] = useState(0);


    useEffect(() => {
        if (id) {
            const hostData = allowHostAccessToken ? datastore.hostData.read() : {};
            getPoll({
                id, accessToken: id in hostData ? hostData[id].pollHostAccessToken : voterAccessToken || undefined
            }).then(poll => {
                setPollDataStatusCode(200);
                setPollData(poll);
                onSuccess && onSuccess(poll);
            }).catch(err => {
                const errorInfo = err as ApiErrorInfo;
                if (errorInfo.info?.status) {
                    setPollDataStatusCode(errorInfo.info.status);
                } else {
                    setPollDataStatusCode(500);
                }
            });
        }
    }, [id, voterAccessToken, onSuccess, allowHostAccessToken]);

    return [pollData, pollDataStatusCode];
}

export function useCheckedInput<T>(defaultValue: T, getHelperText: (value: T) => string | undefined) {
    const [value, setValue] = useState<T>(defaultValue);
    const [helperText, setHelperText] = useState<string | undefined>('');

    useEffect(() => {
        setHelperText(getHelperText(value));
    }, [value, getHelperText]);

    return [value, setValue, helperText] as [T, Dispatch<T>, string | undefined];
}
