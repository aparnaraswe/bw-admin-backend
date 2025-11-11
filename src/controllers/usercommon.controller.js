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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const data_source_1 = require("../config/data-source");
class UserCommonController {
}
_a = UserCommonController;
UserCommonController.fetchProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    try {
        const productId = (_b = req.query) === null || _b === void 0 ? void 0 : _b.productId;
        const queryRunner = data_source_1.AppDataSource.createQueryRunner();
        yield queryRunner.connect();
        let products;
        if (productId) {
            const sql = `
            SELECT 
                id,
                name,
                description,
                price
            FROM products
            WHERE id = ? and is_active = true;
            `;
            const result = yield queryRunner.query(sql, [productId]);
            products = result.length > 0 ? result[0] : null;
        }
        else {
            const sql = `
            SELECT 
                id,
                name,
                description,
                price
            FROM products
            where is_active = true
            ORDER BY id DESC;
            `;
            products = yield queryRunner.query(sql);
        }
        yield queryRunner.release();
        return res.status(200).json({
            success: true,
            data: products,
        });
    }
    catch (err) {
        console.error("❌ Error fetching products:", err);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching products",
        });
    }
});
exports.default = UserCommonController;
