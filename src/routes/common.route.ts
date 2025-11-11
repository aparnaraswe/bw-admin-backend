import express from "express";
import CommonController from "../controllers/common.controller";
import multer from "multer";
import path from "path";
import fs from "fs";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, "../../uploads/products");
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

const upload = multer({ storage });

const router = express.Router();

router.get('/fetchProducts', CommonController.fetchProducts as any);

router.get('/fetchAllProducts', CommonController.fetchAllProducts as any);

router.get('/fetchOrders', CommonController.fetchOrders as any);

router.get('/fetchAllUsers', CommonController.fetchAllUsers as any);

router.get('/fetchCustomerIssues', CommonController.fetchCustomerIssues as any);

router.get("/getDashboardStats", CommonController.getStats as any);
router.get("/getRecentOrders", CommonController.getRecentOrders as any);
router.get("/getPendingIssues", CommonController.getPendingIssues as any);
router.get("/categories", CommonController.getCategories as any);
router.post("/categories", CommonController.addCategory as any);
router.delete("/categories/:id", CommonController.deleteCategory as any);

// Subcategories
router.get("/subcategories", CommonController.getSubcategories as any);
router.post("/subcategories", CommonController.addSubcategory as any);
router.delete("/subcategories/:id", CommonController.deleteSubcategory as any);


router.get("/sizes", CommonController.getSizes as any);
router.post("/sizes", CommonController.addSize as any);
router.delete("/sizes/:id", CommonController.deleteSize as any);
router.patch("/sizes/:id/toggle", CommonController.toggleSizeStatus as any);


router.get("/colours", CommonController.getColours as any);
router.post("/colours", CommonController.addColour as any);
router.delete("/colours/:id", CommonController.deleteColour as any);
router.patch("/colours/:id/toggle", CommonController.toggleColourStatus as any);


router.post('/addProduct',upload.single("image"),  CommonController.addProduct as any);

router.post('/deleteProduct', CommonController.deleteProducts as any);

router.post('/bulkUploadProducts', upload.single("file"), CommonController.bulkUploadProducts as any);
export default router;