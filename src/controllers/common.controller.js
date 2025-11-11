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
const product_entity_1 = __importDefault(require("../models/product.entity"));
const product_varient_entity_1 = __importDefault(require("../models/product-varient.entity"));
const colour_entitity_1 = __importDefault(require("../models/colour.entitity"));
const size_entity_1 = __importDefault(require("../models/size.entity"));
const category_entity_1 = __importDefault(require("../models/category.entity"));
const subcategory_entity_1 = __importDefault(require("../models/subcategory.entity"));
const productValidation_1 = require("../validations/productValidation");
const fs = __importStar(require("fs"));
const csv = __importStar(require("fast-csv"));
class CommonController {
}
_a = CommonController;
CommonController.fetchProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    try {
        const productId = (_b = req.query) === null || _b === void 0 ? void 0 : _b.productId;
        const queryRunner = data_source_1.AppDataSource.createQueryRunner();
        yield queryRunner.connect();
        const colourRepo = data_source_1.AppDataSource.getRepository(colour_entitity_1.default);
        const sizeRepo = data_source_1.AppDataSource.getRepository(size_entity_1.default);
        const categoryRepository = data_source_1.AppDataSource.getRepository(category_entity_1.default);
        const subCategoryRepository = data_source_1.AppDataSource.getRepository(subcategory_entity_1.default);
        // Fetch all lists
        const [colours, sizes, categories, subcategories] = yield Promise.all([
            colourRepo.find(),
            sizeRepo.find(),
            categoryRepository.find(),
            subCategoryRepository.find(),
        ]);
        let product = null;
        if (productId) {
            const sql = `
          SELECT 
            p.id,
            p.name,
            p.description,
            p.price,
            s.id as size_id, s.name as size_name,
            c.id as color_id, c.name as color_name,
            cat.id as category_id, cat.name as category_name,
            subcat.id as subcategory_id, subcat.name as subcategory_name
          FROM products p
          LEFT JOIN size s ON s.id = p.size_id
          LEFT JOIN colour c ON c.id = p.color_id
          LEFT JOIN category cat ON cat.id = p.category_id
          LEFT JOIN subcategory subcat ON subcat.id = p.subcategory_id
          WHERE p.id = ?;
        `;
            const result = yield queryRunner.query(sql, [productId]);
            if (result.length > 0) {
                const row = result[0];
                product = {
                    id: row.id,
                    name: row.name,
                    description: row.description,
                    price: row.price,
                    image: row.image,
                    category: { id: row.category_id, name: row.category_name },
                    subcategory: { id: row.subcategory_id, name: row.subcategory_name },
                    size: { id: row.size_id, name: row.size_name },
                    color: { id: row.color_id, name: row.color_name },
                };
            }
        }
        yield queryRunner.release();
        return res.status(200).json({
            success: true,
            data: {
                product,
                colours,
                sizes,
                categories,
                subcategories,
            },
        });
    }
    catch (err) {
        console.error("❌ Error fetching data:", err);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching product data",
        });
    }
});
CommonController.addProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('*****', JSON.stringify(req.body));
        // Validate input
        const { error, value } = productValidation_1.productSchema.validate(req.body.product, { abortEarly: false });
        const productId = req.body.productId;
        if (error) {
            const errors = error.details.map((err) => err.message);
            return res.status(400).json({ success: false, message: "Validation failed", errors });
        }
        const productRepo = data_source_1.AppDataSource.getRepository(product_entity_1.default);
        const variantRepo = data_source_1.AppDataSource.getRepository(product_varient_entity_1.default);
        // Helper to check duplicate variants in request
        const hasDuplicateVariants = (variants) => {
            const seen = new Set();
            for (const v of variants) {
                const key = `${v.colorId}-${v.sizeId}`;
                if (seen.has(key))
                    return true;
                seen.add(key);
            }
            return false;
        };
        if (value.variants && hasDuplicateVariants(value.variants)) {
            return res.status(400).json({ success: false, message: "Duplicate color-size combination in request" });
        }
        let savedProduct;
        // ------------------- UPDATE PRODUCT -------------------
        if (productId) {
            const existingProduct = yield productRepo.findOne({ where: { id: productId } });
            if (!existingProduct) {
                return res.status(404).json({ success: false, message: "Product not found" });
            }
            // Update main product fields
            productRepo.merge(existingProduct, {
                name: value.name,
                description: value.description || null,
                collection_id: value.collection_id || null,
                category_id: value.category || null,
                subcategory_id: value.subcategory || null,
                price: value.price,
                is_active: value.is_active !== undefined ? value.is_active : true,
            });
            savedProduct = yield productRepo.save(existingProduct);
        }
        else {
            // ------------------- ADD NEW PRODUCT OR FETCH EXISTING -------------------
            savedProduct = yield productRepo.findOne({
                where: {
                    name: value.name,
                    category_id: value.category || null,
                    subcategory_id: value.subcategory || null,
                    is_active: true,
                },
            });
            if (!savedProduct) {
                const newProduct = productRepo.create({
                    name: value.name,
                    description: value.description || null,
                    collection_id: value.collection_id || null,
                    category_id: value.category || null,
                    subcategory_id: value.subcategory || null,
                    price: value.price,
                    is_active: value.is_active !== undefined ? value.is_active : true,
                });
                savedProduct = yield productRepo.save(newProduct);
            }
        }
        // ------------------- HANDLE VARIANTS WITH SOFT DELETE -------------------
        if (value.variants && value.variants.length) {
            const existingVariants = yield variantRepo.find({ where: { product_id: savedProduct.id } });
            const existingMap = new Map(existingVariants.map(v => [`${v.color_id}-${v.size_id}`, v]));
            const newSet = new Set(value.variants.map((v) => `${v.colorId}-${v.sizeId}`));
            // Update existing variants: activate/deactivate
            for (const [key, variant] of existingMap.entries()) {
                if (newSet.has(key)) {
                    if (!variant.is_active) {
                        variant.is_active = true;
                        yield variantRepo.save(variant);
                    }
                }
                else {
                    if (variant.is_active) {
                        variant.is_active = false;
                        yield variantRepo.save(variant);
                    }
                }
            }
            // Add new variants not already in DB
            const toAdd = value.variants
                .filter((v) => !existingMap.has(`${v.colorId}-${v.sizeId}`))
                .map((v) => variantRepo.create({
                product_id: savedProduct.id,
                color_id: v.colorId,
                size_id: v.sizeId,
                is_active: true,
            }));
            if (toAdd.length) {
                yield variantRepo.save(toAdd);
            }
        }
        return res.status(productId ? 200 : 201).json({
            success: true,
            message: productId ? "Product updated successfully" : "Product added successfully",
            data: savedProduct,
        });
    }
    catch (err) {
        console.error("❌ Error adding/updating product:", err);
        return res.status(500).json({ success: false, message: "Server error while adding/updating product" });
    }
});
CommonController.deleteProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    try {
        const productId = (_b = req.body) === null || _b === void 0 ? void 0 : _b.productId;
        if (!productId) {
            return res.status(400).json({
                success: false,
                message: "Product ID is required",
            });
        }
        const productRepo = data_source_1.AppDataSource.getRepository(product_entity_1.default);
        // 🔍 Check if product exists
        const existingProduct = yield productRepo.findOne({
            where: { id: Number(productId) },
        });
        if (!existingProduct) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }
        // 🗑️ Delete the product
        yield productRepo.remove(existingProduct);
        return res.status(200).json({
            success: true,
            message: "Product deleted successfully",
        });
    }
    catch (err) {
        console.error("❌ Error deleting product:", err);
        return res.status(500).json({
            success: false,
            message: "Server error while deleting product",
        });
    }
});
CommonController.fetchAllProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1; // current page
        const limit = parseInt(req.query.limit) || 10; // items per page
        const offset = (page - 1) * limit; // calculate offset
        const queryRunner = data_source_1.AppDataSource.createQueryRunner();
        yield queryRunner.connect();
        const sql = `
        SELECT 
        p.id,
        p.name,
        p.description,
        p.price,
        GROUP_CONCAT(CONCAT(s.name, '-', c.name) SEPARATOR ', ') AS variants,
        cat.name AS category,
        subcat.name AS subcategory
        FROM products p
        LEFT JOIN product_variant prod_variant ON prod_variant.product_id = p.id
        LEFT JOIN size s ON s.id = prod_variant.size_id
        LEFT JOIN colour c ON c.id = prod_variant.color_id
        LEFT JOIN category cat ON cat.id = p.category_id
        LEFT JOIN subcategory subcat ON subcat.id = p.subcategory_id
        WHERE p.is_active = true and prod_variant.is_active = true
        GROUP BY p.id, p.name, p.description, p.price, cat.name, subcat.name
        ORDER BY p.id DESC
        LIMIT ${limit} OFFSET ${offset};
      `;
        const products = yield queryRunner.query(sql);
        // ✅ Get total count
        const countSql = `SELECT COUNT(*) AS total FROM products;`;
        const countResult = yield queryRunner.query(countSql);
        const totalCount = parseInt(countResult[0].total);
        yield queryRunner.release();
        return res.status(200).json({
            success: true,
            data: {
                products,
                totalCount, // ✅ Send total records for pagination
                currentPage: page,
                itemsPerPage: limit
            }
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
CommonController.fetchOrders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const queryRunner = data_source_1.AppDataSource.createQueryRunner();
        yield queryRunner.connect();
        const sql = `
      SELECT 
        o.id,
        u.email,
        o.order_number,
        o.user_id AS user_name, -- Later you can join users table
        o.total_amount,
        o.final_amount,
        o.status,
        o.created_at,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'product_name', p.name,
            'variant', oi.variant,
            'quantity', oi.quantity,
            'price', oi.price
          )
        ) AS items
      FROM orders o
      LEFT JOIN order_items oi ON oi.orderId = o.id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN users u ON u.id = o.user_id
      GROUP BY 
        o.id, o.order_number, o.user_id, 
        o.total_amount, o.final_amount, 
        o.status, o.created_at
      ORDER BY o.id DESC
      LIMIT ${limit} OFFSET ${offset};
    `;
        const orders = yield queryRunner.query(sql);
        const countSql = `SELECT COUNT(*) AS total FROM orders;`;
        const countResult = yield queryRunner.query(countSql);
        const totalCount = parseInt(countResult[0].total);
        yield queryRunner.release();
        return res.status(200).json({
            success: true,
            data: {
                orders,
                totalCount,
                currentPage: page,
                itemsPerPage: limit
            }
        });
    }
    catch (err) {
        console.error("❌ Error fetching orders:", err);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching orders",
        });
    }
});
CommonController.bulkUploadProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const file = req.file;
    if (!file) {
        return res.status(400).json({
            success: false,
            message: "CSV file is required for bulk upload.",
        });
    }
    const productRepo = data_source_1.AppDataSource.getRepository(product_entity_1.default);
    const variantRepo = data_source_1.AppDataSource.getRepository(product_varient_entity_1.default);
    const queryRunner = data_source_1.AppDataSource.createQueryRunner();
    yield queryRunner.connect();
    yield queryRunner.startTransaction();
    try {
        const products = [];
        // ✅ Stream and parse CSV (non-blocking)
        yield new Promise((resolve, reject) => {
            fs.createReadStream(file.path)
                .pipe(csv.parse({ headers: true, ignoreEmpty: true }))
                .on("error", reject)
                .on("data", (row) => {
                // Ensure required fields are present
                if (row.name && row.price) {
                    products.push(row);
                }
            })
                .on("end", resolve);
        });
        console.log(`🟢 Loaded ${products.length} products from CSV file`);
        if (!products.length) {
            return res.status(400).json({
                success: false,
                message: "No valid products found in CSV file.",
            });
        }
        // ✅ Process in batches to avoid overload
        const batchSize = 100;
        for (let i = 0; i < products.length; i += batchSize) {
            const batch = products.slice(i, i + batchSize);
            const productEntities = batch.map((p) => productRepo.create({
                name: p.name,
                description: p.description || null,
                price: parseFloat(p.price),
                category_id: p.category_id ? Number(p.category_id) : null,
                subcategory_id: p.subcategory_id ? Number(p.subcategory_id) : null,
                collection_id: p.collection_id ? Number(p.collection_id) : null,
                color_id: p.color_id ? Number(p.color_id) : null,
                size_id: p.size_id ? Number(p.size_id) : null,
                is_active: true,
            }));
            yield queryRunner.manager.save(productEntities);
        }
        // ✅ Commit transaction
        yield queryRunner.commitTransaction();
        yield queryRunner.release();
        // ✅ Delete temp file
        fs.unlinkSync(file.path);
        return res.status(201).json({
            success: true,
            message: "Bulk upload successful",
            totalUploaded: products.length,
        });
    }
    catch (err) {
        yield queryRunner.rollbackTransaction();
        console.error("❌ Bulk upload failed:", err);
        return res.status(500).json({
            success: false,
            message: "Server error during bulk upload",
            error: err.message,
        });
    }
    finally {
        // cleanup
        if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }
    }
});
CommonController.fetchAllUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const queryRunner = data_source_1.AppDataSource.createQueryRunner();
        yield queryRunner.connect();
        const sql = `
        SELECT
          id, 
          email, 
          role,
          createdAt
        FROM users
        ORDER BY createdAt DESC
        LIMIT ${limit} OFFSET ${offset};
      `;
        const users = yield queryRunner.query(sql);
        const countSql = `SELECT COUNT(*) AS total FROM users;`;
        const countResult = yield queryRunner.query(countSql);
        const totalCount = parseInt(countResult[0].total);
        yield queryRunner.release();
        res.status(200).json({
            success: true,
            data: {
                users,
                totalCount,
                currentPage: page,
                itemsPerPage: limit
            }
        });
    }
    catch (err) {
        console.error("Error fetching users:", err);
        res.status(500).json({
            success: false,
            message: "Error fetching users"
        });
    }
});
CommonController.fetchCustomerIssues = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const sql = `
        SELECT 
          ci.id,
          u.email AS customer_email,
          ci.issue_title,
          ci.issue_description,
          ci.status,
          ci.createdAt
        FROM customer_issues ci
        JOIN users u ON u.id = ci.user_id
        ORDER BY ci.createdAt DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
        const issues = yield data_source_1.AppDataSource.query(sql);
        const count = yield data_source_1.AppDataSource.query(`SELECT COUNT(*) AS total FROM customer_issues`);
        return res.status(200).json({
            success: true,
            data: {
                issues,
                totalCount: count[0].total,
                currentPage: page,
                itemsPerPage: limit
            }
        });
    }
    catch (err) {
        res.status(500).json({ success: false, message: "Error fetching issues" });
    }
});
CommonController.getStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const sql = `
        SELECT
          (SELECT COUNT(*) FROM orders) AS totalOrders,
          (SELECT COUNT(*) FROM users) AS totalCustomers,
          (SELECT COALESCE(SUM(final_amount), 0) FROM orders) AS totalRevenue,
          (SELECT COUNT(*) FROM customer_issues WHERE status <> 'RESOLVED') AS openIssues
      `;
        const stats = yield data_source_1.AppDataSource.query(sql);
        res.status(200).json({
            success: true,
            data: stats[0]
        });
    }
    catch (err) {
        console.error("Dashboard Stats Error:", err);
        res.status(500).json({ success: false, message: "Error loading dashboard stats" });
    }
});
// ✅ Order status chart data + recent orders
CommonController.getRecentOrders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const recentSql = `
        SELECT 
          o.order_number,
          u.email AS customer,
          o.status,
          o.final_amount
        FROM orders o
        JOIN users u ON u.id = o.user_id
        ORDER BY o.created_at DESC
        LIMIT 5
      `;
        const statusSql = `
        SELECT
          SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending,
          SUM(CASE WHEN status = 'CONFIRMED' THEN 1 ELSE 0 END) AS confirmed,
          SUM(CASE WHEN status = 'DELIVERED' THEN 1 ELSE 0 END) AS delivered
        FROM orders
      `;
        const orders = yield data_source_1.AppDataSource.query(recentSql);
        const statusStats = yield data_source_1.AppDataSource.query(statusSql);
        res.status(200).json({
            success: true,
            data: { orders, statusStats: statusStats[0] }
        });
    }
    catch (err) {
        console.error("Recent Orders Error:", err);
        res.status(500).json({ success: false, message: "Error loading recent orders" });
    }
});
// ✅ Pending customer issues
CommonController.getPendingIssues = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const sql = `
        SELECT 
          ci.id,
          u.email,
          ci.issue_title,
          ci.createdAt
        FROM customer_issues ci
        JOIN users u ON u.id = ci.user_id
        WHERE ci.status <> 'RESOLVED'
        ORDER BY ci.createdAt DESC
        LIMIT 5
      `;
        const issues = yield data_source_1.AppDataSource.query(sql);
        res.status(200).json({
            success: true,
            data: { issues }
        });
    }
    catch (err) {
        console.error("Pending Issues Error:", err);
        res.status(500).json({ success: false, message: "Error loading pending issues" });
    }
});
CommonController.getCategories = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const repo = data_source_1.AppDataSource.getRepository(category_entity_1.default);
        const categories = yield repo.find({ order: { id: "DESC" } });
        return res.status(200).json({ success: true, data: categories });
    }
    catch (err) {
        console.error("❌ Error fetching categories:", err);
        res.status(500).json({ success: false, message: "Error fetching categories" });
    }
});
// ✅ Add new category
CommonController.addCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name } = req.body;
        if (!(name === null || name === void 0 ? void 0 : name.trim())) {
            return res.status(400).json({ success: false, message: "Category name is required" });
        }
        const repo = data_source_1.AppDataSource.getRepository(category_entity_1.default);
        const existing = yield repo.findOne({ where: { name } });
        if (existing) {
            return res.status(400).json({ success: false, message: "Category already exists" });
        }
        const newCat = repo.create({ name });
        yield repo.save(newCat);
        res.status(201).json({ success: true, message: "Category added successfully" });
    }
    catch (err) {
        console.error("❌ Error adding category:", err);
        res.status(500).json({ success: false, message: "Error adding category" });
    }
});
// ✅ Delete category (hard delete)
CommonController.deleteCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id);
        const repo = data_source_1.AppDataSource.getRepository(category_entity_1.default);
        const category = yield repo.findOne({ where: { id } });
        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }
        yield repo.delete({ id });
        res.status(200).json({ success: true, message: "Category deleted successfully" });
    }
    catch (err) {
        console.error("❌ Error deleting category:", err);
        res.status(500).json({ success: false, message: "Error deleting category" });
    }
});
// ✅ Toggle category active/inactive
CommonController.toggleCategoryStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id);
        const repo = data_source_1.AppDataSource.getRepository(category_entity_1.default);
        const category = yield repo.findOne({ where: { id } });
        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }
        category.is_active = !category.is_active;
        yield repo.save(category);
        res.status(200).json({
            success: true,
            message: `Category ${category.is_active ? "activated" : "deactivated"} successfully`,
        });
    }
    catch (err) {
        console.error("❌ Error toggling category:", err);
        res.status(500).json({ success: false, message: "Error updating category status" });
    }
});
/**
 * ===========================
 * SUBCATEGORY CONTROLLERS
 * ===========================
 */
// ✅ Get all subcategories
CommonController.getSubcategories = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const repo = data_source_1.AppDataSource.getRepository(subcategory_entity_1.default);
        const subcategories = yield repo.find({ order: { id: "DESC" } });
        return res.status(200).json({ success: true, data: subcategories });
    }
    catch (err) {
        console.error("❌ Error fetching subcategories:", err);
        res.status(500).json({ success: false, message: "Error fetching subcategories" });
    }
});
// ✅ Add new subcategory
CommonController.addSubcategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name } = req.body;
        if (!(name === null || name === void 0 ? void 0 : name.trim())) {
            return res.status(400).json({ success: false, message: "Subcategory name is required" });
        }
        const repo = data_source_1.AppDataSource.getRepository(subcategory_entity_1.default);
        const existing = yield repo.findOne({ where: { name } });
        if (existing) {
            return res.status(400).json({ success: false, message: "Subcategory already exists" });
        }
        const newSub = repo.create({ name });
        yield repo.save(newSub);
        res.status(201).json({ success: true, message: "Subcategory added successfully" });
    }
    catch (err) {
        console.error("❌ Error adding subcategory:", err);
        res.status(500).json({ success: false, message: "Error adding subcategory" });
    }
});
// ✅ Delete subcategory (hard delete)
CommonController.deleteSubcategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id);
        const repo = data_source_1.AppDataSource.getRepository(subcategory_entity_1.default);
        const subcategory = yield repo.findOne({ where: { id } });
        if (!subcategory) {
            return res.status(404).json({ success: false, message: "Subcategory not found" });
        }
        yield repo.delete({ id });
        res.status(200).json({ success: true, message: "Subcategory deleted successfully" });
    }
    catch (err) {
        console.error("❌ Error deleting subcategory:", err);
        res.status(500).json({ success: false, message: "Error deleting subcategory" });
    }
});
// ✅ Toggle subcategory active/inactive
CommonController.toggleSubcategoryStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id);
        const repo = data_source_1.AppDataSource.getRepository(subcategory_entity_1.default);
        const subcategory = yield repo.findOne({ where: { id } });
        if (!subcategory) {
            return res.status(404).json({ success: false, message: "Subcategory not found" });
        }
        subcategory.is_active = !subcategory.is_active;
        yield repo.save(subcategory);
        res.status(200).json({
            success: true,
            message: `Subcategory ${subcategory.is_active ? "activated" : "deactivated"} successfully`,
        });
    }
    catch (err) {
        console.error("❌ Error toggling subcategory:", err);
        res.status(500).json({ success: false, message: "Error updating subcategory status" });
    }
});
CommonController.getSizes = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const repo = data_source_1.AppDataSource.getRepository(size_entity_1.default);
        const sizes = yield repo.find({ order: { id: "DESC" } });
        return res.status(200).json({ success: true, data: sizes });
    }
    catch (err) {
        console.error("❌ Error fetching sizes:", err);
        res.status(500).json({ success: false, message: "Error fetching sizes" });
    }
});
// ✅ Add size
CommonController.addSize = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name } = req.body;
        if (!(name === null || name === void 0 ? void 0 : name.trim())) {
            return res.status(400).json({ success: false, message: "Size name is required" });
        }
        const repo = data_source_1.AppDataSource.getRepository(size_entity_1.default);
        const existing = yield repo.findOne({ where: { name } });
        if (existing) {
            return res.status(400).json({ success: false, message: "Size already exists" });
        }
        const newSize = repo.create({ name });
        yield repo.save(newSize);
        res.status(201).json({ success: true, message: "Size added successfully" });
    }
    catch (err) {
        console.error("❌ Error adding size:", err);
        res.status(500).json({ success: false, message: "Error adding size" });
    }
});
// ✅ Delete size
CommonController.deleteSize = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id);
        const repo = data_source_1.AppDataSource.getRepository(size_entity_1.default);
        const sizeRepo = yield repo.findOne({ where: { id } });
        if (!sizeRepo) {
            return res.status(404).json({ success: false, message: "Size not found" });
        }
        yield repo.delete({ id });
        res.status(200).json({ success: true, message: "Size deleted successfully" });
    }
    catch (err) {
        console.error("❌ Error deleting size:", err);
        res.status(500).json({ success: false, message: "Error deleting size" });
    }
});
// ✅ Toggle size active/inactive
CommonController.toggleSizeStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id);
        const repo = data_source_1.AppDataSource.getRepository(size_entity_1.default);
        const sizeRepo = yield repo.findOne({ where: { id } });
        if (!sizeRepo) {
            return res.status(404).json({ success: false, message: "Size not found" });
        }
        sizeRepo.is_active = !sizeRepo.is_active;
        yield repo.save(sizeRepo);
        res.status(200).json({
            success: true,
            message: `Size ${sizeRepo.is_active ? "activated" : "deactivated"} successfully`,
        });
    }
    catch (err) {
        console.error("❌ Error toggling size:", err);
        res.status(500).json({ success: false, message: "Error updating size status" });
    }
});
CommonController.getColours = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const repo = data_source_1.AppDataSource.getRepository(colour_entitity_1.default);
        const colours = yield repo.find({ order: { id: "DESC" } });
        return res.status(200).json({ success: true, data: colours });
    }
    catch (err) {
        console.error("❌ Error fetching colours:", err);
        res.status(500).json({ success: false, message: "Error fetching colours" });
    }
});
// ✅ Add new colour
CommonController.addColour = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, hex_code } = req.body;
        if (!(name === null || name === void 0 ? void 0 : name.trim())) {
            return res.status(400).json({ success: false, message: "Colour name is required" });
        }
        const repo = data_source_1.AppDataSource.getRepository(colour_entitity_1.default);
        const existing = yield repo.findOne({ where: { name } });
        if (existing) {
            return res.status(400).json({ success: false, message: "Colour already exists" });
        }
        const newColour = repo.create({ name, hex_code });
        yield repo.save(newColour);
        res.status(201).json({ success: true, message: "Colour added successfully" });
    }
    catch (err) {
        console.error("❌ Error adding colour:", err);
        res.status(500).json({ success: false, message: "Error adding colour" });
    }
});
// ✅ Delete colour
CommonController.deleteColour = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id);
        const repo = data_source_1.AppDataSource.getRepository(colour_entitity_1.default);
        const colourRepo = yield repo.findOne({ where: { id } });
        if (!colourRepo) {
            return res.status(404).json({ success: false, message: "Colour not found" });
        }
        yield repo.delete({ id });
        res.status(200).json({ success: true, message: "Colour deleted successfully" });
    }
    catch (err) {
        console.error("❌ Error deleting colour:", err);
        res.status(500).json({ success: false, message: "Error deleting colour" });
    }
});
// ✅ Toggle colour active/inactive
CommonController.toggleColourStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id);
        const repo = data_source_1.AppDataSource.getRepository(colour_entitity_1.default);
        const colourRepo = yield repo.findOne({ where: { id } });
        if (!colourRepo) {
            return res.status(404).json({ success: false, message: "Colour not found" });
        }
        colourRepo.is_active = !colourRepo.is_active;
        yield repo.save(colourRepo);
        res.status(200).json({
            success: true,
            message: `Colour ${colourRepo.is_active ? "activated" : "deactivated"} successfully`,
        });
    }
    catch (err) {
        console.error("❌ Error toggling colour:", err);
        res.status(500).json({ success: false, message: "Error updating colour status" });
    }
});
exports.default = CommonController;
