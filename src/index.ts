import fg from "fast-glob";
import * as dotenv from "dotenv";
dotenv.config();
import * as aws from "aws-sdk";
import { createReadStream } from "fs";
const s3 = new aws.S3({
  accessKeyId: process.env.S3_ACCESS,
  secretAccessKey: process.env.S3_SECRET,
});
import { AppDataSource } from './connection';
AppDataSource.initialize();
// const db = mongoose.createConnection(process.env.MONGO_URI);
import {EmailTemplateEntity, TemplateType} from './emailtemp.entity'
import { PutObjectRequest } from "aws-sdk/clients/s3";
const run = async () => {
  const Email = AppDataSource.getRepository(EmailTemplateEntity);
  const files = await fg(["emails/**/html.pug"], { dot: true });
  const total = files.length;
  let docs = 0;

  console.log("-----------------processing started ------------------------");
  // process.exit(0)
  files.map(async (path: string, i:number) => {
    setTimeout(async () => {
      const bucket = <string>process.env.S3_EMAIL_BUCKET || 'intellect-email-templates';
      const keys = path.split("/");
      const lang = keys[keys.length - 2];
      const s3keyBase = path.replace("html.pug", "");
      const name = keys.slice(1, keys.length - 2).join("/");
      const [htmlStream, subjectStream] = [
        createReadStream(`${s3keyBase}html.pug`),
        createReadStream(`${s3keyBase}subject.pug`),
      ];
      const emailOptions: PutObjectRequest = {
        Bucket: bucket,
        Body: htmlStream,
        Key: `${s3keyBase}html`,
        ContentType: "text/plain;charset=utf-8",
        // ACL: "public-read",
        Metadata: {
          type: "pug",
        },
      };
      const subjectOptions: PutObjectRequest = {
        Bucket: bucket,
        Body: subjectStream,
        Key: `${s3keyBase}subject`,
        ContentType: "text/plain;charset=utf-8",
        // ACL: "public-read",
        Metadata: {
          type: "pug",
        },
      };
      const [email, subject] = await Promise.all([
        s3.upload(emailOptions).promise(),
        s3.upload(subjectOptions).promise(),
      ]);
      let template = await Email.findOne({
        where: {
          name: name,
          lang: lang,
        },
        select: ['id'],
      });
      if (template) {
        await Email.update(
          {
            id: template.id,
          },
          {
            type: TemplateType.PUG,
            email: email.Location,
            subject: subject.Location,
            variables: [],
          },
        );
      } else {
        const newTemplate = Email.create({
          name: name,
          lang: lang,
          type: TemplateType.PUG,
          email: email.Location,
          subject: subject.Location,
        });
        await Email.insert(newTemplate);
      }
      if (lang == "en") {
        docs++;
      }
      console.log(
        "%d out %d templates processed - %s lang: %s,bucket: %s",
        i + 1,
        total,
        name,
        lang,
        docs,
        bucket
      );
      if (i + 1 === total) {
        console.log(
          "-----------------processing complete ------------------------"
        );
        process.exit(0);
      }
    }, 500 * i);
  });
};
run().then(() => {});
