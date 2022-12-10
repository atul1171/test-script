const { Schema } = require("mongoose");
const emailSchema = new Schema(
  {
    name: String,
    variables: [{ type: Array, default: [] }],
    templates: [
      new Schema(
        {
          lang: String,
          type: String,
          email: {
            key: String,
            location: String,
          },
          subject: {
            key: String,
            location: String,
          },
        },
        { _id: false }
      ),
    ],
  },
  {
    timestamps: true,
  }
);
module.exports = emailSchema;
