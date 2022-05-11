import crypto from 'crypto';
import express from 'express';
import blindSignatures from 'blind-signatures';
import { BigInteger } from 'jsbn';

import Poll from '../models/poll';
import config from '../config';
import { generateRandomAccessToken } from '../utils/utils';
import { openPoll, sendPollUpdate, closePoll } from '../websocket/update-clients';

const router = express.Router();


router.post('/create_poll', async (req, res) => {
    let { question, options, isMultipleChoice, isSigned, accessTokens, accessTokenCount } = req.body;
    let key;
    let pollHostAccessToken;

    // sanity checks
    if (!question || !options || isSigned === undefined || isMultipleChoice === undefined
        || Array.isArray(options) === false || options.length < 2 || options.length !== new Set(options).size) {
        return res.sendStatus(400);
    }

    if (isSigned) {
        if (accessTokens) {
            // check if custom accessTokens are legit
            if (Array.isArray(accessTokens) === false || accessTokens.length < 2
                || accessTokens.length !== new Set(accessTokens).size) {
                return res.sendStatus(400);
            }

            if (accessTokens.some((token: any) => typeof token !== 'string')) {
                return res.sendStatus(400);
            }

        } else {
            if (accessTokenCount === undefined || accessTokenCount < 2) {
                return res.sendStatus(400);
            }

            accessTokens = Array(accessTokenCount).fill(null).map(generateRandomAccessToken);
        }

        key = blindSignatures.keyGeneration();
    }

    pollHostAccessToken = generateRandomAccessToken();

    const { e, n, p, q, d, dmp1, dmq1, coeff } = key ? {
        e: key.keyPair.e.toString(),
        n: key.keyPair.n.toString(),
        p: key.keyPair.p.toString(),
        q: key.keyPair.q.toString(),
        d: key.keyPair.d.toString(),
        dmp1: key.keyPair.dmp1.toString(),
        dmq1: key.keyPair.dmq1.toString(),
        coeff: key.keyPair.coeff.toString()
    } : {
        e: null, n: null, p: null, q: null, d: null, dmp1: null, dmq1: null, coeff: null
    };
    const poll = await new Poll({
        question,
        options,
        votes: options.map((option: string) => ({ option, count: 0 })),
        isMultipleChoice,
        isSigned,
        pollHostAccessToken,
        accessTokens,
        usedAccessTokens: [],
        wsId: generateRandomAccessToken(),
        key: { e, n, p, q, d, dmp1, dmq1, coeff },
        usedPublicKeySigs: [],
        ended: false
    }).save();

    openPoll(poll);

    res.status(201).json({
        id: poll._id,
        accessTokens: accessTokens && accessTokens.length > 1 ? accessTokens : undefined,
        pollHostAccessToken: pollHostAccessToken,
    });
});


function getPoll(req: express.Request, res: express.Response, next: express.NextFunction) {
    Poll.findById(req.body.id).then(poll => {
        if (!poll) {
            return res.sendStatus(404);
        }

        req.body.poll = poll;
        next();

    }).catch(err => {
        if (err.name === 'CastError') {
            return res.sendStatus(404);
        }
        console.error(err);
        res.sendStatus(500);
    });
}

function getPollForPublic(poll: any) {
    return {
        id: poll._id,
        wsId: poll.wsId,
        question: poll.question,
        options: poll.options,
        votes: poll.votes,
        isMultipleChoice: poll.isMultipleChoice,
        isSigned: poll.isSigned,
        ended: poll.ended,
        publicKey: poll.isSigned ? { e: poll.key.e, n: poll.key.n } : undefined
    };
}


router.post('/get_poll', getPoll, async (req, res) => {
    const { poll, accessToken } = req.body;

    if (poll.isSigned && poll.pollHostAccessToken !== accessToken && !poll.accessTokens.includes(accessToken)) {
        return res.sendStatus(401);
    }

    res.status(200).json(getPollForPublic(poll));
});


router.post('/sign_pubkey', getPoll, async (req, res) => {
    const { poll, accessToken, blindedPubKeyHash } = req.body;

    if (poll.isSigned === false || !accessToken) {
        return res.sendStatus(400);
    }

    if (poll.usedAccessTokens.includes(accessToken)) {
        // used accessToken
        return res.sendStatus(403);
    }

    const accessTokenIndex = poll.accessTokens.indexOf(accessToken);
    if (accessTokenIndex === -1) {
        // incorrect accessToken
        return res.sendStatus(403);
    }

    if (!blindedPubKeyHash || typeof blindedPubKeyHash !== 'string' || blindedPubKeyHash.match(/[^0-9]/)) {
        // blindedPubKeyHash is not valid
        return res.sendStatus(400);
    }

    // accessToken accepted, mark it as used
    poll.usedAccessTokens.push(accessToken);
    await poll.save();

    // blindly sign the blindedPubKey
    const blindSignature = blindSignatures.sign({
        blinded: blindedPubKeyHash,
        key: { keyPair: { n: new BigInteger(poll.key.n), d: new BigInteger(poll.key.d), e: poll.key.e } },
    });

    res.status(200).json({
        blindSignature: blindSignature.toString(),
    });
});


router.post('/vote', async (req, res) => {
    const { message, messageSig, publicKey, publicKeySig } = req.body;
    let parsed;
    try {
        parsed = JSON.parse(message);
    } catch (e) {
        return res.sendStatus(400);
    }
    const { id, options } = parsed;

    let poll: any;
    try {
        poll = await Poll.findById(id);
    } catch (err) {
        if ((err as Error).name === 'CastError') {
            return res.sendStatus(404);
        }
        console.error(err);
        res.sendStatus(500);
    }

    if (!poll) {
        return res.sendStatus(404);
    }

    if (poll.ended) {
        return res.sendStatus(403);
    }

    // verify the option
    if (Array.isArray(options) === false || options.length === 0 || ((options.length > 1) && !poll.isMultipleChoice)
        || options.some((option: any) => typeof option !== 'string')
        || options.some((option: any) => poll.options.indexOf(option) === -1)) {
        return res.status(400).json({ error: 'option is not valid' });
    }

    if (poll.isSigned) {
        if (!messageSig || !publicKey || !publicKeySig
            || typeof messageSig !== 'string' || typeof publicKey !== 'string'
            || typeof publicKeySig !== 'string' || publicKeySig.match(/[^0-9]/)) {
            return res.sendStatus(401);
        }

        // check if publicKeySig is already used
        if (poll.usedPublicKeySigs.indexOf(publicKeySig) !== -1) {
            return res.sendStatus(403);
        }

        // verify the publicKey signature
        if (blindSignatures.verify2({
            unblinded: new BigInteger(publicKeySig),
            key: { keyPair: { n: new BigInteger(poll.key.n), d: new BigInteger(poll.key.d), e: poll.key.e } },
            message: publicKey
        }) === false) {
            return res.status(400).json({ error: 'publicKey signature is not valid' });
        }

        // verify the message signature
        if (!crypto.createVerify(config.SIGNATURE_ALGORITHM).update(message)
            .verify(publicKey, messageSig, config.SIGNATURE_ENCONDING)) {
            return res.status(400).json({ error: 'message signature is not valid' });
        }

        // add the publicKeySig to the list of used publicKeySigs
        poll.usedPublicKeySigs.push(publicKeySig);
        // if (poll.usedPublicKeySigs.length === poll.accessTokens.length) {
        //     poll.ended = true;
        // }
        await poll.save();
    }

    options.forEach((option: string) => {
        const vote = poll.votes.find((vote: { option: String }) => vote.option === option);
        if (vote) {
            vote.count++;
        } else {
            poll.votes.push({ option, count: 1 });
        }
    });

    await poll.save();
    res.sendStatus(202);

    if (poll.ended) {
        closePoll(poll);
    } else {
        sendPollUpdate(poll);
    }
});


router.post('/end_poll', getPoll, async (req, res) => {
    const { poll, pollHostAccessToken } = req.body;

    if (!pollHostAccessToken || poll.pollHostAccessToken !== pollHostAccessToken) {
        return res.sendStatus(403);
    }

    poll.ended = true;
    await poll.save();
    closePoll(poll);
    res.sendStatus(202);
});


router.post('/get_polls', async (req, res) => {
    const { pollQueries } = req.body;

    if (!pollQueries || !Array.isArray(pollQueries)) {
        return res.sendStatus(400);
    }

    if (pollQueries.length === 0) {
        const publicPolls = await Poll.find({ isSigned: false });
        return res.status(200).json(publicPolls.map(getPollForPublic));
    }

    const mappedQueries = Object.fromEntries(pollQueries.map(
        (query: { id: string, accessToken?: string }) => [query.id, query])
    );

    try {
        const polls = await Poll.find({ _id: { $in: Object.keys(mappedQueries) } });

        res.status(200).json(polls.filter(poll => !poll.isSigned || (() => {
            const query = mappedQueries[poll._id];
            if (!query.accessToken) {
                return false;
            }
            if (poll.pollHostAccessToken === query.accessToken) {
                return true;
            }
            return poll.accessTokens.indexOf(query.accessToken) !== -1;
        })()).map(getPollForPublic));

    } catch (err) {
        if ((err as Error).name === 'CastError') {
            return res.sendStatus(404);
        }
        console.error(err);
        res.sendStatus(500);
    }
});


export default router;
