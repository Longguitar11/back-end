const mongoose = require("mongoose");

const followedSchema = mongoose.Schema(
  {
    user_id: String,
    follows: [
      {
        $ref: "users",
        $id: mongoose.Types.ObjectId,
      },
    ],
  },
  { timestamps: true }
);

const Followed = mongoose.model("Followeds", followedSchema);
module.exports = Followed;