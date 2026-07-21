import { ApiResponse } from "./ApiResponse.js";

class ApiError extends Error {
    constructor(
        statusCode,
        message = "Something went wrong",
        errors = [],
        stack = ""
    ) {
        super(message);
        this.statusCode = statusCode;
        this.data = null;
        this.message = message
        this.success = false;
        this.errors = errors

        if (stack) {
            this.stack = stack;  // Use the original stack trace
        } else {
            Error.captureStackTrace(this, this.constructor); // Generate a new stack trace
        }
    }
}

export { ApiError };

