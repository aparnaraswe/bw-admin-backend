import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "products" })
export default class Products {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 150 })
  name: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "int", nullable: true })
  collection_id: number;

  @Column({ type: "int", nullable: true })
  color_id: number;

  @Column({ type: "int", nullable: true })
  size_id: number;

  @Column({ type: "int", nullable: true })
  category_id: number;

  @Column({ type: "int", nullable: true })
  subcategory_id: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  price: number;

  @Column({ type: "boolean", default: true })
  is_active: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
