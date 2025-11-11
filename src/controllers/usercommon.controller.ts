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

export default class UserCommonController{
  static fetchProducts = async (req: Request, res: Response) => {
        try {
        const productId = req.query?.productId;

        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();

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
            const result = await queryRunner.query(sql, [productId]);
            products = result.length > 0 ? result[0] : null;
        } else {
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
            products = await queryRunner.query(sql);
        }

        await queryRunner.release();

        return res.status(200).json({
            success: true,
            data: products,
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