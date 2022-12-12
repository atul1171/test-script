import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
export enum TemplateType {
  PUG = 'pug',
  HBS = 'hbs',
  MJML = 'mjml',
}
import { CreateDateColumn, UpdateDateColumn } from 'typeorm';

export class DateTimeEntity {
  @CreateDateColumn()
  createdAt?: Date;

  @UpdateDateColumn()
  updatedAt?: Date;
}

@Entity('email_templates')
export class EmailTemplateEntity extends DateTimeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ length: 20 })
  lang: string;

  @Column({
    type: 'enum',
    enum: TemplateType,
    default: TemplateType.PUG,
  })
  type: TemplateType;

  @Column({ type: 'text' })
  email: string; //s3 url for email template

  @Column({ type: 'text' })
  subject: string; //s3 url for subject template

  @Column({ type: 'simple-array', nullable: true })
  variables: string[]; // template variables
}
