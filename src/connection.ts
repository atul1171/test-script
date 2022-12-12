import { DataSource, DataSourceOptions } from 'typeorm';
import { EmailTemplateEntity } from './emailtemp.entity';

const dataSourceOptions : DataSourceOptions= {
  type: 'mysql',
  host: process.env.DB_HOST,
  port: 3306,
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  synchronize: false,
  entities: [EmailTemplateEntity],
  logging: false,
};

export const AppDataSource = new DataSource(dataSourceOptions);