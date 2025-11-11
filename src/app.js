"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const data_source_1 = require("./config/data-source");
const dotenv = __importStar(require("dotenv"));
const routes_1 = __importDefault(require("./routes"));
const morgan_middleware_1 = __importDefault(require("./middlewares/morgan.middleware"));
dotenv.config();
const PORT = Number(process.env.PORT);
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json()); //Parse JSON Request Bodies
app.use(express_1.default.urlencoded({ extended: true })); //Parse URL-encoded Data, parse nested objects
app.use(morgan_middleware_1.default);
app.use("/api", routes_1.default);
data_source_1.AppDataSource.initialize()
    .then(() => {
    app.listen(PORT, () => {
        // eslint-disable-next-line no-console
        console.log(`Server is running at http://localhost:${PORT}`);
    });
})
    .catch((error) => console.error("Error initializing database", error));
