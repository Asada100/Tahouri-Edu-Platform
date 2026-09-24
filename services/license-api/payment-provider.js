"use strict";

const crypto = require("crypto");

const PROVIDER = String(process.env.TAHOURI_PAYMENT_PROVIDER || "manual").trim().toLowerCase();

function verifyCallback({ payment, authority, status, amount, currency }) {
    if (PROVIDER === "manual") {
        if (process.env.NODE_ENV === "production") {
            throw new Error("Manual payment verification is disabled in production.");
        }

        return status === "verified" && Boolean(authority);
    }

    throw new Error(
        "Payment provider adapter is not implemented for: " + PROVIDER
    );
}

module.exports = {
    PROVIDER,
    verifyCallback
};
