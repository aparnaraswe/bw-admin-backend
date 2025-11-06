import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn
} from "typeorm";
import User from "./user.entity";

@Entity({ name: "customer_issues" })
export class CustomerIssue {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column()
  user_id: number;

  @Column({ type: "varchar", length: 255 })
  issue_title: string;

  @Column({ type: "text" })
  issue_description: string;

  @Column({ type: "varchar", length: 20, default: "NEW" })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
