import "reflect-metadata";
import { DataSource } from "typeorm";
import * as dotenv from "dotenv";

dotenv.config();

export const AppDataSource = new DataSource({
  type: "mysql",
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT) || 3306,
  username: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  synchronize: true, // auto create tables — turn off in production
  logging: false,
  entities: [__dirname + "/../models/**/*.{js,ts}"],
  migrations: [__dirname + "/../migrations/**/*.{js,ts}"],
  subscribers: [],
});
