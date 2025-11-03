import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "product_variant" })  // plural or singular, pick consistent naming
export default class ProductVariant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "int" })
  product_id: number;

  @Column({ type: "int" })
  color_id: number;

  @Column({ type: "int" })
  size_id: number;

  @Column({ type: "boolean", default: true })
  is_active: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
