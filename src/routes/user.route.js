"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const user_controller_1 = __importDefault(require("../controllers/user.controller"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = express_1.default.Router();
router.post('/register', user_controller_1.default.registeredUser);
router.post('/login', user_controller_1.default.loginUser);
router.get('/', (0, auth_middleware_1.authenticateJWT)(["admin"]), user_controller_1.default.getAllUsers);
router.delete('/:id', (0, auth_middleware_1.authenticateJWT)(["admin"]), user_controller_1.default.deleteUser);
exports.default = router;
