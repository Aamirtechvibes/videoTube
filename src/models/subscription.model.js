import mongoose, { Schema } from "mongoose";
import { subscribe } from "node:diagnostics_channel";
import { type } from "node:os";

const subscrpiotionSchema = new Schema({

    subscriber: {
        type: Schema.Types.ObjectId, // one who is subscribing
        ref: "User"
    },
    channel: {
        type: Schema.Types.ObjectId, // one whom 'subscriber' is subscribing
        ref: "User"
    }
}, { timestamps: true })

export const Subscription = mongoose.model("Subscription", subscrpiotionSchema)