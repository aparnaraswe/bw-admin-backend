import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";
import User from "../models/user.entity";
import Products from "../models/product.entity";
import ProductVariant from "../models/product-varient.entity";
import colour from "../models/colour.entitity";
import size from "../models/size.entity";
import categoryRepo from "../models/category.entity";
import subcategoryRepo from "../models/subcategory.entity";
import { cadSchema, productSchema, stackSchema } from "../validations/productValidation";
import * as fs from "fs";
import * as csv from "fast-csv";

export default class CommonController{
  static fetchProducts = async (req: Request, res: Response) => {
    try {
      const productId = req.query?.productId;

      const queryRunner = AppDataSource.createQueryRunner();
      await queryRunner.connect();

      const colourRepo = AppDataSource.getRepository(colour);
      const sizeRepo = AppDataSource.getRepository(size);
      const categoryRepository = AppDataSource.getRepository(categoryRepo);
      const subCategoryRepository = AppDataSource.getRepository(subcategoryRepo);

      // Fetch all lists
      const [colours, sizes, categories, subcategories] = await Promise.all([
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

        const result = await queryRunner.query(sql, [productId]);
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

      await queryRunner.release();

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
    } catch (err) {
      console.error("❌ Error fetching data:", err);
      return res.status(500).json({
        success: false,
        message: "Server error while fetching product data",
      });
    }
  };

  static addProduct = async (req: Request, res: Response) => {
  try {
    console.log('*****', JSON.stringify(req.body));

    // Validate input
    const { error, value } = productSchema.validate(req.body.product, { abortEarly: false });
    const productId = req.body.productId;

    if (error) {
      const errors = error.details.map((err : any) => err.message);
      return res.status(400).json({ success: false, message: "Validation failed", errors });
    }

    const productRepo = AppDataSource.getRepository(Products);
    const variantRepo = AppDataSource.getRepository(ProductVariant);

    // Helper to check duplicate variants in request
    const hasDuplicateVariants = (variants: any[]) => {
      const seen = new Set();
      for (const v of variants) {
        const key = `${v.colorId}-${v.sizeId}`;
        if (seen.has(key)) return true;
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
      const existingProduct = await productRepo.findOne({ where: { id: productId } });
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

      savedProduct = await productRepo.save(existingProduct);

    } else {
      // ------------------- ADD NEW PRODUCT OR FETCH EXISTING -------------------
      savedProduct = await productRepo.findOne({
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
        savedProduct = await productRepo.save(newProduct);
      }
    }

    // ------------------- HANDLE VARIANTS WITH SOFT DELETE -------------------
    if (value.variants && value.variants.length) {
      const existingVariants = await variantRepo.find({ where: { product_id: savedProduct.id } });

      const existingMap = new Map(existingVariants.map(v => [`${v.color_id}-${v.size_id}`, v]));
      const newSet = new Set(value.variants.map((v : any) => `${v.colorId}-${v.sizeId}`));

      // Update existing variants: activate/deactivate
      for (const [key, variant] of existingMap.entries()) {
        if (newSet.has(key)) {
          if (!variant.is_active) {
            variant.is_active = true;
            await variantRepo.save(variant);
          }
        } else {
          if (variant.is_active) {
            variant.is_active = false;
            await variantRepo.save(variant);
          }
        }
      }

      // Add new variants not already in DB
      const toAdd = value.variants
        .filter((v : any) => !existingMap.has(`${v.colorId}-${v.sizeId}`))
        .map((v : any) => variantRepo.create({
          product_id: savedProduct.id,
          color_id: v.colorId,
          size_id: v.sizeId,
          is_active: true,
        }));

      if (toAdd.length) {
        await variantRepo.save(toAdd);
      }
    }

    return res.status(productId ? 200 : 201).json({
      success: true,
      message: productId ? "Product updated successfully" : "Product added successfully",
      data: savedProduct,
    });

  } catch (err) {
    console.error("❌ Error adding/updating product:", err);
    return res.status(500).json({ success: false, message: "Server error while adding/updating product" });
  }
  };

  static deleteProducts = async (req: Request, res: Response) => {
    try {
      const productId = req.body?.productId

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: "Product ID is required",
        });
      }

      const productRepo = AppDataSource.getRepository(Products);

      // 🔍 Check if product exists
      const existingProduct = await productRepo.findOne({
        where: { id: Number(productId) },
      });

      if (!existingProduct) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      // 🗑️ Delete the product
      await productRepo.remove(existingProduct);

      return res.status(200).json({
        success: true,
        message: "Product deleted successfully",
      });
    } catch (err) {
      console.error("❌ Error deleting product:", err);
      return res.status(500).json({
        success: false,
        message: "Server error while deleting product",
      });
    }
  };

  static fetchAllProducts = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;           // current page
      const limit = parseInt(req.query.limit as string) || 10;       // items per page
      const offset = (page - 1) * limit;                             // calculate offset

      const queryRunner = AppDataSource.createQueryRunner();
      await queryRunner.connect();

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

      const products = await queryRunner.query(sql);

      // ✅ Get total count
      const countSql = `SELECT COUNT(*) AS total FROM products;`;
      const countResult = await queryRunner.query(countSql);
      const totalCount = parseInt(countResult[0].total);

      await queryRunner.release();

      return res.status(200).json({
        success: true,
        data: {
          products,
          totalCount,        // ✅ Send total records for pagination
          currentPage: page,
          itemsPerPage: limit
        }
      });

    } catch (err) {
      console.error("❌ Error fetching products:", err);
      return res.status(500).json({
        success: false,
        message: "Server error while fetching products",
      });
    }
  };

  static fetchOrders = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();

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

    const orders = await queryRunner.query(sql);

    const countSql = `SELECT COUNT(*) AS total FROM orders;`;
    const countResult = await queryRunner.query(countSql);
    const totalCount = parseInt(countResult[0].total);

    await queryRunner.release();

    return res.status(200).json({
      success: true,
      data: {
        orders,
        totalCount,
        currentPage: page,
        itemsPerPage: limit
      }
    });

  } catch (err) {
    console.error("❌ Error fetching orders:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching orders",
    });
  }
  };

  static bulkUploadProducts = async (req: Request, res: Response) => {
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "CSV file is required for bulk upload.",
      });
    }

    const productRepo = AppDataSource.getRepository(Products);
    const variantRepo = AppDataSource.getRepository(ProductVariant);
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const products: any[] = [];

      // ✅ Stream and parse CSV (non-blocking)
      await new Promise<void>((resolve, reject) => {
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

        const productEntities: Products[] = batch.map((p: any) =>
          productRepo.create({
            name: p.name,
            description: p.description || null,
            price: parseFloat(p.price),
            category_id: p.category_id ? Number(p.category_id) : null,
            subcategory_id: p.subcategory_id ? Number(p.subcategory_id) : null,
            collection_id: p.collection_id ? Number(p.collection_id) : null,
            color_id: p.color_id ? Number(p.color_id) : null,
            size_id: p.size_id ? Number(p.size_id) : null,
            is_active: true,
          } as Products)
        );

        await queryRunner.manager.save(productEntities);

      }

      // ✅ Commit transaction
      await queryRunner.commitTransaction();
      await queryRunner.release();

      // ✅ Delete temp file
      fs.unlinkSync(file.path);

      return res.status(201).json({
        success: true,
        message: "Bulk upload successful",
        totalUploaded: products.length,
      });
    } catch (err :any) {
      await queryRunner.rollbackTransaction();
      console.error("❌ Bulk upload failed:", err);

      return res.status(500).json({
        success: false,
        message: "Server error during bulk upload",
        error: err.message,
      });
    } finally {
      // cleanup
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    }
  };

  static fetchAllUsers = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;

      const queryRunner = AppDataSource.createQueryRunner();
      await queryRunner.connect();

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

      const users = await queryRunner.query(sql);

      const countSql = `SELECT COUNT(*) AS total FROM users;`;
      const countResult = await queryRunner.query(countSql);
      const totalCount = parseInt(countResult[0].total);

      await queryRunner.release();

      res.status(200).json({
        success: true,
        data: {
          users,
          totalCount,
          currentPage: page,
          itemsPerPage: limit
        }
      });
    } catch (err) {
      console.error("Error fetching users:", err);
      res.status(500).json({
        success: false,
        message: "Error fetching users"
      });
    }
  };


  static fetchCustomerIssues = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
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

      const issues = await AppDataSource.query(sql);

      const count = await AppDataSource.query(
        `SELECT COUNT(*) AS total FROM customer_issues`
      );

      return res.status(200).json({
        success: true,
        data: {
          issues,
          totalCount: count[0].total,
          currentPage: page,
          itemsPerPage: limit
        }
      });

    } catch (err) {
      res.status(500).json({ success: false, message: "Error fetching issues" });
    }
  };

  static getStats = async (req: Request, res: Response) => {
    try {
      const sql = `
        SELECT
          (SELECT COUNT(*) FROM orders) AS totalOrders,
          (SELECT COUNT(*) FROM users) AS totalCustomers,
          (SELECT COALESCE(SUM(final_amount), 0) FROM orders) AS totalRevenue,
          (SELECT COUNT(*) FROM customer_issues WHERE status <> 'RESOLVED') AS openIssues
      `;

      const stats = await AppDataSource.query(sql);

      res.status(200).json({
        success: true,
        data: stats[0]
      });

    } catch (err) {
      console.error("Dashboard Stats Error:", err);
      res.status(500).json({ success: false, message: "Error loading dashboard stats" });
    }
  };

  // ✅ Order status chart data + recent orders
  static getRecentOrders = async (req: Request, res: Response) => {
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

      const orders = await AppDataSource.query(recentSql);
      const statusStats = await AppDataSource.query(statusSql);

      res.status(200).json({
        success: true,
        data: { orders, statusStats: statusStats[0] }
      });

    } catch (err) {
      console.error("Recent Orders Error:", err);
      res.status(500).json({ success: false, message: "Error loading recent orders" });
    }
  };

  // ✅ Pending customer issues
  static getPendingIssues = async (req: Request, res: Response) => {
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

      const issues = await AppDataSource.query(sql);

      res.status(200).json({
        success: true,
        data: { issues }
      });

    } catch (err) {
      console.error("Pending Issues Error:", err);
      res.status(500).json({ success: false, message: "Error loading pending issues" });
    }
  };

    static getCategories = async (req: Request, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(categoryRepo);
      const categories = await repo.find({ order: { id: "DESC" } });
      return res.status(200).json({ success: true, data: categories });
    } catch (err) {
      console.error("❌ Error fetching categories:", err);
      res.status(500).json({ success: false, message: "Error fetching categories" });
    }
  };

  // ✅ Add new category
  static addCategory = async (req: Request, res: Response) => {
    try {
      const { name } = req.body;
      if (!name?.trim()) {
        return res.status(400).json({ success: false, message: "Category name is required" });
      }

      const repo = AppDataSource.getRepository(categoryRepo);
      const existing = await repo.findOne({ where: { name } });
      if (existing) {
        return res.status(400).json({ success: false, message: "Category already exists" });
      }

      const newCat = repo.create({ name });
      await repo.save(newCat);
      res.status(201).json({ success: true, message: "Category added successfully" });
    } catch (err) {
      console.error("❌ Error adding category:", err);
      res.status(500).json({ success: false, message: "Error adding category" });
    }
  };

  // ✅ Delete category (hard delete)
  static deleteCategory = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const repo = AppDataSource.getRepository(categoryRepo);

      const category = await repo.findOne({ where: { id } });
      if (!category) {
        return res.status(404).json({ success: false, message: "Category not found" });
      }

      await repo.delete({ id });
      res.status(200).json({ success: true, message: "Category deleted successfully" });
    } catch (err) {
      console.error("❌ Error deleting category:", err);
      res.status(500).json({ success: false, message: "Error deleting category" });
    }
  };

  // ✅ Toggle category active/inactive
  static toggleCategoryStatus = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const repo = AppDataSource.getRepository(categoryRepo);

      const category = await repo.findOne({ where: { id } });
      if (!category) {
        return res.status(404).json({ success: false, message: "Category not found" });
      }

      category.is_active = !category.is_active;
      await repo.save(category);

      res.status(200).json({
        success: true,
        message: `Category ${category.is_active ? "activated" : "deactivated"} successfully`,
      });
    } catch (err) {
      console.error("❌ Error toggling category:", err);
      res.status(500).json({ success: false, message: "Error updating category status" });
    }
  };

  /**
   * ===========================
   * SUBCATEGORY CONTROLLERS
   * ===========================
   */

  // ✅ Get all subcategories
  static getSubcategories = async (req: Request, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(subcategoryRepo);
      const subcategories = await repo.find({ order: { id: "DESC" } });
      return res.status(200).json({ success: true, data: subcategories });
    } catch (err) {
      console.error("❌ Error fetching subcategories:", err);
      res.status(500).json({ success: false, message: "Error fetching subcategories" });
    }
  };

  // ✅ Add new subcategory
  static addSubcategory = async (req: Request, res: Response) => {
    try {
      const { name } = req.body;
      if (!name?.trim()) {
        return res.status(400).json({ success: false, message: "Subcategory name is required" });
      }

      const repo = AppDataSource.getRepository(subcategoryRepo);
      const existing = await repo.findOne({ where: { name } });
      if (existing) {
        return res.status(400).json({ success: false, message: "Subcategory already exists" });
      }

      const newSub = repo.create({ name });
      await repo.save(newSub);
      res.status(201).json({ success: true, message: "Subcategory added successfully" });
    } catch (err) {
      console.error("❌ Error adding subcategory:", err);
      res.status(500).json({ success: false, message: "Error adding subcategory" });
    }
  };

  // ✅ Delete subcategory (hard delete)
  static deleteSubcategory = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const repo = AppDataSource.getRepository(subcategoryRepo);

      const subcategory = await repo.findOne({ where: { id } });
      if (!subcategory) {
        return res.status(404).json({ success: false, message: "Subcategory not found" });
      }

      await repo.delete({ id });
      res.status(200).json({ success: true, message: "Subcategory deleted successfully" });
    } catch (err) {
      console.error("❌ Error deleting subcategory:", err);
      res.status(500).json({ success: false, message: "Error deleting subcategory" });
    }
  };

  // ✅ Toggle subcategory active/inactive
  static toggleSubcategoryStatus = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const repo = AppDataSource.getRepository(subcategoryRepo);

      const subcategory = await repo.findOne({ where: { id } });
      if (!subcategory) {
        return res.status(404).json({ success: false, message: "Subcategory not found" });
      }

      subcategory.is_active = !subcategory.is_active;
      await repo.save(subcategory);

      res.status(200).json({
        success: true,
        message: `Subcategory ${subcategory.is_active ? "activated" : "deactivated"} successfully`,
      });
    } catch (err) {
      console.error("❌ Error toggling subcategory:", err);
      res.status(500).json({ success: false, message: "Error updating subcategory status" });
    }
  };
  static getSizes = async (req: Request, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(size);
      const sizes = await repo.find({ order: { id: "DESC" } });
      return res.status(200).json({ success: true, data: sizes });
    } catch (err) {
      console.error("❌ Error fetching sizes:", err);
      res.status(500).json({ success: false, message: "Error fetching sizes" });
    }
  };

  // ✅ Add size
  static addSize = async (req: Request, res: Response) => {
    try {
      const { name } = req.body;
      if (!name?.trim()) {
        return res.status(400).json({ success: false, message: "Size name is required" });
      }

      const repo = AppDataSource.getRepository(size);
      const existing = await repo.findOne({ where: { name } });
      if (existing) {
        return res.status(400).json({ success: false, message: "Size already exists" });
      }

      const newSize = repo.create({ name });
      await repo.save(newSize);
      res.status(201).json({ success: true, message: "Size added successfully" });
    } catch (err) {
      console.error("❌ Error adding size:", err);
      res.status(500).json({ success: false, message: "Error adding size" });
    }
  };

  // ✅ Delete size
  static deleteSize = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const repo = AppDataSource.getRepository(size);

      const sizeRepo = await repo.findOne({ where: { id } });
      if (!sizeRepo) {
        return res.status(404).json({ success: false, message: "Size not found" });
      }

      await repo.delete({ id });
      res.status(200).json({ success: true, message: "Size deleted successfully" });
    } catch (err) {
      console.error("❌ Error deleting size:", err);
      res.status(500).json({ success: false, message: "Error deleting size" });
    }
  };

  // ✅ Toggle size active/inactive
  static toggleSizeStatus = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const repo = AppDataSource.getRepository(size);

      const sizeRepo = await repo.findOne({ where: { id } });
      if (!sizeRepo) {
        return res.status(404).json({ success: false, message: "Size not found" });
      }

      sizeRepo.is_active = !sizeRepo.is_active;
      await repo.save(sizeRepo);

      res.status(200).json({
        success: true,
        message: `Size ${sizeRepo.is_active ? "activated" : "deactivated"} successfully`,
      });
    } catch (err) {
      console.error("❌ Error toggling size:", err);
      res.status(500).json({ success: false, message: "Error updating size status" });
    }
  };
  static getColours = async (req: Request, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(colour);
      const colours = await repo.find({ order: { id: "DESC" } });
      return res.status(200).json({ success: true, data: colours });
    } catch (err) {
      console.error("❌ Error fetching colours:", err);
      res.status(500).json({ success: false, message: "Error fetching colours" });
    }
  };

  // ✅ Add new colour
  static addColour = async (req: Request, res: Response) => {
    try {
      const { name, hex_code } = req.body;
      if (!name?.trim()) {
        return res.status(400).json({ success: false, message: "Colour name is required" });
      }

      const repo = AppDataSource.getRepository(colour);
      const existing = await repo.findOne({ where: { name } });
      if (existing) {
        return res.status(400).json({ success: false, message: "Colour already exists" });
      }

      const newColour = repo.create({ name, hex_code });
      await repo.save(newColour);
      res.status(201).json({ success: true, message: "Colour added successfully" });
    } catch (err) {
      console.error("❌ Error adding colour:", err);
      res.status(500).json({ success: false, message: "Error adding colour" });
    }
  };

  // ✅ Delete colour
  static deleteColour = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const repo = AppDataSource.getRepository(colour);

      const colourRepo = await repo.findOne({ where: { id } });
      if (!colourRepo) {
        return res.status(404).json({ success: false, message: "Colour not found" });
      }

      await repo.delete({ id });
      res.status(200).json({ success: true, message: "Colour deleted successfully" });
    } catch (err) {
      console.error("❌ Error deleting colour:", err);
      res.status(500).json({ success: false, message: "Error deleting colour" });
    }
  };

  // ✅ Toggle colour active/inactive
  static toggleColourStatus = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const repo = AppDataSource.getRepository(colour);

      const colourRepo = await repo.findOne({ where: { id } });
      if (!colourRepo) {
        return res.status(404).json({ success: false, message: "Colour not found" });
      }

      colourRepo.is_active = !colourRepo.is_active;
      await repo.save(colourRepo);

      res.status(200).json({
        success: true,
        message: `Colour ${colourRepo.is_active ? "activated" : "deactivated"} successfully`,
      });
    } catch (err) {
      console.error("❌ Error toggling colour:", err);
      res.status(500).json({ success: false, message: "Error updating colour status" });
    }
  };


}