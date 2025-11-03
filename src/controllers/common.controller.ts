import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";
import User from "../models/user.entity";
import Products from "../models/product.entity";
import ProductVariant from "../models/product-varient.entity";
import colour from "../models/colour.entitity";
import size from "../models/size.entity";
import category from "../models/category.entity";
import subcategory from "../models/subcategory.entity";
import { productSchema } from "../validations/productValidation";

export default class CommonController{
    static fetchProducts = async (req: Request, res: Response) => {
    try {
      const productId = req.query?.productId;

      const queryRunner = AppDataSource.createQueryRunner();
      await queryRunner.connect();

      const colourRepo = AppDataSource.getRepository(colour);
      const sizeRepo = AppDataSource.getRepository(size);
      const categoryRepo = AppDataSource.getRepository(category);
      const subCategoryRepo = AppDataSource.getRepository(subcategory);

      // Fetch all lists
      const [colours, sizes, categories, subcategories] = await Promise.all([
        colourRepo.find(),
        sizeRepo.find(),
        categoryRepo.find(),
        subCategoryRepo.find(),
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





}