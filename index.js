import fg from "fast-glob";
import mongoose from "mongoose";
import * as dotenv from "dotenv";
dotenv.config();
import aws from "aws-sdk";
import { createReadStream } from "fs";
const s3 = new aws.S3({
  accessKeyId: process.env.S3_ACCESS,
  secretAccessKey: process.env.S3_SECRET,
});
const db = mongoose.createConnection(process.env.MONGO_URI);
import emailSchema from "./emailtemp.cjs";
const run = async () => {
  const Email = db.model("emailtemplates", emailSchema);
  const files = await fg(["emails/**/html.pug"], { dot: true });
  const total = files.length;
  let docs = 0;

  console.log("-----------------processing started ------------------------");
  files.map(async (path, i) => {
    setTimeout(async () => {
      const keys = path.split("/");
      const lang = keys[keys.length - 2];
      const s3keyBase = path.replace("html.pug", "");
      const name = keys.slice(1, keys.length - 2).join("/");
      const [htmlStream, subjectStream] = [
        createReadStream(`${s3keyBase}html.pug`),
        createReadStream(`${s3keyBase}subject.pug`),
      ];
      const emailOptions = {
        Bucket: process.env.S3_BUCKET,
        Body: htmlStream,
        Key: `${s3keyBase}html`,
        ContentType: "text/plain;charset=utf-8",
        ACL: "public-read",
        Metadata: {
          type: "pug",
        },
      };
      const subjectOptions = {
        Bucket: process.env.S3_BUCKET,
        Body: subjectStream,
        Key: `${s3keyBase}subject`,
        ContentType: "text/plain;charset=utf-8",
        ACL: "public-read",
        Metadata: {
          type: "pug",
        },
      };
      const [email, subject] = await Promise.all([
        s3.upload(emailOptions).promise(),
        s3.upload(subjectOptions).promise(),
      ]);
      const exisiting = await Email.findOne(
        {
          name: name,
        },
        { "templates.lang": 1 }
      );
      const findQuery = { name: name };
      let upsertQuery = {};
      if (
        exisiting &&
        exisiting.templates.some((template) => template.lang == lang)
      ) {
        findQuery["templates.lang"] = lang;
        upsertQuery = {
          $set: {
            "templates.$.lang": lang,
            "templates.$.type": "pug",
            "templates.$.email": {
              key: email.Key,
              location: email.Location,
            },
            "templates.$.subject": {
              key: subject.Key,
              location: subject.Location,
            },
          },
        };
      } else {
        upsertQuery = {
          $push: {
            templates: {
              lang: lang,
              type: "pug",
              email: { key: email.Key, location: email.Location },
              subject: { key: subject.Key, location: subject.Location },
            },
          },
        };
      }

      await Email.updateOne(findQuery, upsertQuery, {
        upsert: true,
        returnOriginal: false,
      });
      if (lang == "en") {
        docs++;
      }
      console.log(
        "%d out %d templates processed - %s lang: %s, docs : %d",
        i + 1,
        total,
        name,
        lang,
        docs
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
