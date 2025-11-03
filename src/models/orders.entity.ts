import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { OrderItem } from "./order_items.entity";

@Entity({ name: "orders" })
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", unique: true })
  order_number: string;

  @Column({ type: "varchar", length: 100 })
  user_id: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  total_amount: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  final_amount: number;

  @Column({ type: "varchar", length: 20 })
  status: string; // e.g., 'PENDING', 'CONFIRMED', 'DELIVERED'

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  // Relation: 1 order -> many order items
  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];
}
