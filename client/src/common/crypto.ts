import keypair from 'keypair';
import CryptoJS from "crypto-js";
import JSEncrypt from "jsencrypt";
import { BigInteger } from 'jsbn';

export function rsaSha256Sign(message: string, privateKey: string) {
    const sign = new JSEncrypt();
    sign.setPrivateKey(privateKey);
    return sign.sign(message, CryptoJS.SHA256 as any, "sha256");
}

export function generateKeysAndBlind(pollPubKey: { e: string, n: string }) {
    const keys = keypair();
    const publicKey = keys.public;
    const privateKey = keys.private;
    const { blinded: blindedPubKeyHash, r: blindingFactor } = blind({
        E: pollPubKey.e, N: pollPubKey.n, message: publicKey
    });
    return {
        publicKey: publicKey,
        privateKey: privateKey,
        blindedPubKeyHash: blindedPubKeyHash.toString(),
        blindingFactor: blindingFactor.toString()
    };
}

export function unblindSignature(blindedSignature: string, blindingFactor: string,
    pollPubKey: { e: string, n: string }, votePubKey: string): string | null {
    const signature = unblind({ signed: blindedSignature, r: blindingFactor, N: pollPubKey.n });
    if (verify({ unblinded: signature, message: votePubKey, N: pollPubKey.n, E: pollPubKey.e })) {
        return signature.toString();
    }
    throw new Error('Failed to verify signature');
}


// webpack doesn't want to pack node stuff, and CRA is not letting me do anything about it
// I have to paste this code in here and remove the node part rather than just using the npm package

// the code below is taken from https://github.com/kevinejohn/blind-signatures (MIT license)

// MIT License

// Copyright (c) 2018 Kevin Johnson (KevinEJohn)

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

var secureRandom = require('secure-random');

var sha256 = require('js-sha256');

function messageToHash(message: string) {
    var messageHash = sha256(message);
    return messageHash;
}

function messageToHashInt(message: string) {
    var messageHash = messageToHash(message);
    var messageBig = new BigInteger(messageHash, 16);
    return messageBig;
}

function blind(_ref: any) {
    var message = _ref.message,
        key = _ref.key,
        N = _ref.N,
        E = _ref.E;
    var messageHash = messageToHashInt(message);
    N = key ? key.keyPair.n : new BigInteger(N.toString());
    E = key ? new BigInteger(key.keyPair.e.toString()) : new BigInteger(E.toString());
    var bigOne = new BigInteger('1');
    var gcd;
    var r;

    do {
        r = new BigInteger(secureRandom(64)).mod(N);
        gcd = r.gcd(N);
    } while (!gcd.equals(bigOne) || r.compareTo(N) >= 0 || r.compareTo(bigOne) <= 0);

    var blinded = messageHash.multiply(r.modPow(E, N)).mod(N);
    return {
        blinded: blinded,
        r: r
    };
}

function unblind(_ref3: any) {
    var signed = _ref3.signed,
        key = _ref3.key,
        r = _ref3.r,
        N = _ref3.N;
    r = new BigInteger(r.toString());
    N = key ? key.keyPair.n : new BigInteger(N.toString());
    signed = new BigInteger(signed.toString());
    var unblinded = signed.multiply(r.modInverse(N)).mod(N);
    return unblinded;
}

function verify(_ref4: any) {
    var unblinded = _ref4.unblinded,
        key = _ref4.key,
        message = _ref4.message,
        E = _ref4.E,
        N = _ref4.N;
    unblinded = new BigInteger(unblinded.toString());
    var messageHash = messageToHashInt(message);
    N = key ? key.keyPair.n : new BigInteger(N.toString());
    E = key ? new BigInteger(key.keyPair.e.toString()) : new BigInteger(E.toString());
    var originalMsg = unblinded.modPow(E, N);
    var result = messageHash.equals(originalMsg);
    return result;
}
