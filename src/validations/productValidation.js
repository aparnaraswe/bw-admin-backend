"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stackSchema = exports.cadSchema = exports.productSchema = void 0;
const joi_1 = __importDefault(require("joi"));
// JOI schema for product
exports.productSchema = joi_1.default.object({
    name: joi_1.default.string().min(1).required(),
    description: joi_1.default.string().min(3).required(),
    price: joi_1.default.number().required(),
    category: joi_1.default.number().required(),
    subcategory: joi_1.default.number().required(),
    is_active: joi_1.default.boolean(),
    // new array of variants
    variants: joi_1.default.array().items(joi_1.default.object({
        colorId: joi_1.default.number().required(),
        sizeId: joi_1.default.number().required()
    })).min(1).required(),
    quantity: joi_1.default.number().optional(),
    image: joi_1.default.string().allow(null).optional(),
    productId: joi_1.default.number().allow(null).optional()
});
exports.cadSchema = joi_1.default.object({
    cardNo: joi_1.default.number().required(),
    bags: joi_1.default.number().required(),
    weigth: joi_1.default.number().required(),
    ischecked: joi_1.default.boolean().required(),
});
exports.stackSchema = joi_1.default.object({
    stackNo: joi_1.default.number().required(),
    bags: joi_1.default.number().required(),
    weigth: joi_1.default.number().required()
});
