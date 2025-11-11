"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const morgan_1 = __importDefault(require("morgan"));
const logger_utils_1 = __importDefault(require("../utils/logger.utils"));
// Create a stream object for Morgan to use Winston
const stream = {
    write: (message) => logger_utils_1.default.http(message.trim()), // Trim the newline
};
const morganMiddleware = (0, morgan_1.default)("dev", { stream });
exports.default = morganMiddleware;
