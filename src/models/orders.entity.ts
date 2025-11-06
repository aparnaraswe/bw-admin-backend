import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { OrderItem } from "./order_items.entity";
import User from "./user.entity";

@Entity({ name: "orders" })
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", unique: true })
  order_number: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User;


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
