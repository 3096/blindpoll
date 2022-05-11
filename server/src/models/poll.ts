import mongoose from "mongoose";

const pollSchema = new mongoose.Schema({
    question: String,
    options: [String],
    votes: [{
        option: String,
        count: Number
    }],
    isMultipleChoice: Boolean,
    isSigned: Boolean,
    pollHostAccessToken: String,
    accessTokens: [String],
    usedAccessTokens: [String],
    wsId: String,
    key: {
        e: String,
        n: String,
        p: String,
        q: String,
        d: String,
        dmp1: String,
        dmq1: String,
        coeff: String
    },
    usedPublicKeySigs: [String],
    ended: Boolean
});

export default mongoose.model("Poll", pollSchema);
