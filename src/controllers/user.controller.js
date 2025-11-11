"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const data_source_1 = require("../config/data-source");
const user_entity_1 = __importDefault(require("../models/user.entity"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
class UserController {
}
_a = UserController;
/**
 * @desc    Register a new user
 * @route   POST /api/users/register
 * @access  Public
 */
UserController.registeredUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password, role } = req.body;
        const userRepo = data_source_1.AppDataSource.getRepository(user_entity_1.default);
        const existing = yield userRepo.findOne({ where: { email } });
        console.log('existing', existing);
        if (existing) {
            res.status(400).json({ message: "User already exists" });
        }
        else {
            const hashedPassword = yield bcrypt_1.default.hash(password, 10);
            const user = userRepo.create({ email, password: hashedPassword, role });
            yield userRepo.save(user);
            res.status(201).json({ message: "User registered successfully" });
        }
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});
/**
 * @desc    Login a user and return JWT token
 * @route   POST /api/users/login
 * @access  Public
 */
UserController.loginUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        const userRepo = data_source_1.AppDataSource.getRepository(user_entity_1.default);
        const user = yield userRepo.findOne({ where: { email } });
        if (!user || !(yield bcrypt_1.default.compare(password, user.password))) {
            // send exact error message
            res.status(401).json({ message: "Invalid credentials" });
        }
        else {
            const token = (0, auth_middleware_1.generateToken)({ id: user.id, email: user.email, role: user.role });
            res.status(200).json({ token, message: "Login successful" }); // include success message
        }
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});
/**
 * @desc    Get all users (admin only)
 * @route   GET /api/users
 * @access  Private (Admin only)
 */
UserController.getAllUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userRepo = data_source_1.AppDataSource.getRepository(user_entity_1.default);
        const users = yield userRepo.find();
        res.json(users);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});
/**
 * @desc    Delete a user by ID (admin only)
 * @route   DELETE /api/users/:id
 * @access  Private (Admin only)
 */
UserController.deleteUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userRepo = data_source_1.AppDataSource.getRepository(user_entity_1.default);
        yield userRepo.delete(req.params.id);
        res.json({ message: "User deleted" });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});
exports.default = UserController;
