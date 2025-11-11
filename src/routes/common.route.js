"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const common_controller_1 = __importDefault(require("../controllers/common.controller"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path_1.default.join(__dirname, "../../uploads/products");
        fs_1.default.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, file.fieldname + "-" + uniqueSuffix + ext);
    },
});
const upload = (0, multer_1.default)({ storage });
const router = express_1.default.Router();
router.get('/fetchProducts', common_controller_1.default.fetchProducts);
router.get('/fetchAllProducts', common_controller_1.default.fetchAllProducts);
router.get('/fetchOrders', common_controller_1.default.fetchOrders);
router.get('/fetchAllUsers', common_controller_1.default.fetchAllUsers);
router.get('/fetchCustomerIssues', common_controller_1.default.fetchCustomerIssues);
router.get("/getDashboardStats", common_controller_1.default.getStats);
router.get("/getRecentOrders", common_controller_1.default.getRecentOrders);
router.get("/getPendingIssues", common_controller_1.default.getPendingIssues);
router.get("/categories", common_controller_1.default.getCategories);
router.post("/categories", common_controller_1.default.addCategory);
router.delete("/categories/:id", common_controller_1.default.deleteCategory);
// Subcategories
router.get("/subcategories", common_controller_1.default.getSubcategories);
router.post("/subcategories", common_controller_1.default.addSubcategory);
router.delete("/subcategories/:id", common_controller_1.default.deleteSubcategory);
router.get("/sizes", common_controller_1.default.getSizes);
router.post("/sizes", common_controller_1.default.addSize);
router.delete("/sizes/:id", common_controller_1.default.deleteSize);
router.patch("/sizes/:id/toggle", common_controller_1.default.toggleSizeStatus);
router.get("/colours", common_controller_1.default.getColours);
router.post("/colours", common_controller_1.default.addColour);
router.delete("/colours/:id", common_controller_1.default.deleteColour);
router.patch("/colours/:id/toggle", common_controller_1.default.toggleColourStatus);
router.post('/addProduct', upload.single("image"), common_controller_1.default.addProduct);
router.post('/deleteProduct', common_controller_1.default.deleteProducts);
router.post('/bulkUploadProducts', upload.single("file"), common_controller_1.default.bulkUploadProducts);
exports.default = router;
