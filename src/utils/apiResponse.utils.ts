import { Response } from "express";

export default class ApiResponse {
    static send(res: Response, statusCode: number, message: string, data: any = null) {
        return res.status(statusCode).json({ statusCode, message, data });
    }

    static ok(res: Response, message: string = "OK", data: any = null) {
        return this.send(res, 200, message, data);
    }

    static created(res: Response, message: string = "Created", data: any = null) {
        return this.send(res, 201, message, data);
    }

    static badRequest(res: Response, message: string = "Bad Request") {
        return this.send(res, 400, message, null);
    }

    static unauthorized(res: Response, message: string = "Unauthorized") {
        return this.send(res, 401, message, null);
    }

    static forbidden(res: Response, message: string = "Forbidden") {
        return this.send(res, 403, message, null);
    }

    static notFound(res: Response, message: string = "Not Found") {
        return this.send(res, 404, message, null);
    }

    static conflict(res: Response, message: string = "Conflict") {
        return this.send(res, 409, message, null);
    }

    static unprocessable(res: Response, message: string = "Unprocessable Entity") {
        return this.send(res, 422, message, null);
    }

    static serverError(res: Response, message: string = "Internal Server Error", data?: any) {
        return this.send(res, 500, message, null);
    }

    static gatewayTimeout(res: Response, message: string = "Gateway Timeout") {
        return this.send(res, 504, message, null);
    }
}
