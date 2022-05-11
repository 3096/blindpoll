# blindpoll

Anonymity without double voting.

## Features

- Real-time poll results.
- Anonymous voting.
- Double voting prevention mechanism.

## Anonymity + Double Voting Prevention

A blind signature is applied when you sign a message without actually being able to see its content or its hash. The message is *blinded* by the author using a secret "blinding factor"; the signer signs the blinded message, creating a blind signature. When the author of the message receives the blinded signature, they can then *unblind* it using the blinding factor and they will get the valid signature to their original, unblinded message. It's like signing a document sealed in an envelope without opening or seeing it, but your ink can somehow seep through the envelope and end up signing the document inside.

In **BlindPoll**, the message author is the voter, and the signer is the poll server. This protocol works by the server blindly signing the voter's public key, and the voter can use their own private key to sign their vote. When the vote is cast along with the voter's public key, the server can verify the vote's signature using the public key, as well as verify that the public key is signed by none other than the server itself. But because the server has never seen the public key before, it only knows that it is valid and doesn't know who it belongs to.

Here is a sequence diagram of the process:

![BlindPoll voting protocol sequence diagram](https://cdn.discordapp.com/attachments/910295728058953748/971135983380729907/unknown0.png)

With this protocol, the only caveat is that in order to confirm that the voter has not already signed their vote public key during the blind signature process, some kind of credential verification is required. In BlindPoll, this is implemented by requiring a unique, single-use access token in order to obtain the blind signature. Voter authentication and receiving the access token are done outside of the application, requiring the poll organizer to select the voters beforehand and distribute the access token. In other words, the poll organizer would still know who the potential voters are, but BlindPoll offers a layer of anonymity that makes it impossible to link the vote to a specific voter or know who voted or not. The voter can rest easy knowing that their vote cannot be linked back to them, and the poll organizer can also sleep well knowing that every vote is authentic, cast by an honest voter.

## Implementation

To use the blind signature functionality in BlindPoll, the poll must be created as **invite only**. This will give the poll creator a list of access tokens which they can, in turn, distribute to a list of desired voters.

A "vote later" option is provided for the voters, which requests the blind signature, but does not cast any vote right away. This allows voters to dissociate their vote time from their signature request time, making the it harder to track by using the timestamps alone. The voter can also use the "vote later" feature to allow themselves some time to come back with a VPN or proxy, which further increases the difficulty of potential tracking.

The public mode of BlindPoll does not offer any double voting protection.

The app has a front end and a backend part. The front end is written in React and styled with MUI. The backend is written with Express and uses MongoDB as its database. Together with Node.js as the backend runtime, they form the MERN stack. It also uses TypeScript throughout because I don't like pain.

## Build Instructions

The front end is bootstrapped and managed with Create React App and it's probably the single reason why I haven't attempted to set up a nice monorepo yet... You'll have to run the front and back end separately for now.

Before you start, knock a few things off your checklist:

- Install MongoDB Community Edition, instructions can be found here: https://www.mongodb.com/docs/manual/installation/
- Make sure your MongoDB is listening on `mongodb://127.0.0.1:27017` (the default port). Test this with either [mongosh](https://www.mongodb.com/docs/mongodb-shell/) or [MongoDB Compass](https://www.mongodb.com/products/compass) to make sure it's working.
- Make sure you have [Node.js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm). I mean idk why I'm putting this here, ofc you have npm, right? Make sure they are up to date though.
- Install TypeScript if you haven't already. I didn't include this in the package.json because it's meant to be installed with the global -g flag, and frankly, everyone should have TypeScript! (Don't look at my GitHub profile README)
  -     npm i -g typescript

With those, you should be set. Now we will start the backend first. Run these commands one by one:

    cd ./fullstack-polling-app/server
    npm install
    npm start

If everything went smoothly, it should look something like this:

    WebSocket server using port 3002
    Connected to MongoDB at mongodb://127.0.0.1:27017/blindpoll_test
    API server is listening on port 3001

Keep the server running and open a new shell window to run the front end. Just like before, run:

    cd ./fullstack-polling-app/client
    npm install
    npm start

This will start the React development server. **Ignore the webpack warning message**, it's an [open issue](https://github.com/facebook/create-react-app/issues/11756) on Create React App as of writing. I cannot dismiss it without ejecting or using a third-party package for now. It shouldn't affect the app's functionality.

## Known Issues/Quirks

- Use http://localhost:3000 instead of http://127.0.0.1:3000, otherwise, the copy to clipboard feature will not work.
- Client-side data uses Window.localStorage. Currently, there is no way to manage this data from within the app. The user would have to manually edit it if they wish to migrate their data to another device or browser for now.
- The app also tries to prevent you from double voting in public polls by remembering you have voted in localStorage. If you are testing multiple votes on a public poll, you will have to clear your localStorage or use incognito mode. You could also just copy the curl request to bypass the app's check.
- Some useful tooltips are missing on touch screen devices since they are activated by mouse hover.
