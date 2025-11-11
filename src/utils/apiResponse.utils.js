"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ApiResponse {
    static send(res, statusCode, message, data = null) {
        return res.status(statusCode).json({ statusCode, message, data });
    }
    static ok(res, message = "OK", data = null) {
        return this.send(res, 200, message, data);
    }
    static created(res, message = "Created", data = null) {
        return this.send(res, 201, message, data);
    }
    static badRequest(res, message = "Bad Request") {
        return this.send(res, 400, message, null);
    }
    static unauthorized(res, message = "Unauthorized") {
        return this.send(res, 401, message, null);
    }
    static forbidden(res, message = "Forbidden") {
        return this.send(res, 403, message, null);
    }
    static notFound(res, message = "Not Found") {
        return this.send(res, 404, message, null);
    }
    static conflict(res, message = "Conflict") {
        return this.send(res, 409, message, null);
    }
    static unprocessable(res, message = "Unprocessable Entity") {
        return this.send(res, 422, message, null);
    }
    static serverError(res, message = "Internal Server Error", data) {
        return this.send(res, 500, message, null);
    }
    static gatewayTimeout(res, message = "Gateway Timeout") {
        return this.send(res, 504, message, null);
    }
}
exports.default = ApiResponse;
