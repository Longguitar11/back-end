const Tag = require("../models/tag.model")
const BaseError = require("../utils/error-handling/baseError")
const User = require("../models/user.model")

// ----------------------- GET TAGS IN A GET METHOD -----------------------------------
const getTags = async (req, res, next) => {
    try {
        const tags = await Tag.find().sort({ name: "asc" })

        res.status(200).json({
            status: "success",
            message: "Get tags successfully",
            data: { tags },
        })
    } catch (error) {
        next(new BaseError(500, error.message))
    }
}

// ----------------------- FOLLOW SPECIFIC TAG IN A POST METHOD -----------------------------------
const followTag = async (req, res, next) => {
    try {
        const { tagID } = req.params
        const { userID } = req.body
        console.log(userID);

        // increase count follow tag
        const tag = await Tag.updateOne(
            { _id: tagID },
            {
                $inc: { count_following: 1 },
            }
        )

        // update follow tag in user by id
        const updateTagsFollow = await User.findOneAndUpdate(
            { _id: userID },
            {
                $addToSet: { following_tags: tagID },
            },
            { returnOriginal: false }
        )

        // has error or tag not found
        if (tag.modifiedCount === 0) {
            return next(new BaseError(400, "Fail to follow tag, unkown error"))
        }

        res.status(200).json({
            status: "success",
            message: "followed successfully",
            tagfollowed: updateTagsFollow.following_tags,
        })
    } catch (error) {
        next(new BaseError(500, error.message))
    }
}

// ----------------------- UNFOLLOW SPECIFIC TAG IN A POST METHOD -----------------------------------
const unfollowTag = async (req, res, next) => {
    try {
        const { tagID } = req.params
        const { userID } = req.body

        // decrease count follow tag
        const tag = await Tag.updateOne(
            { _id: tagID },
            {
                $inc: { count_following: 1 },
            }
        )

        // has error or tag not found
        if (tag.modifiedCount === 0) {
            return next(new BaseError(400, "Fail to unfollow tag, unkown error"))
        }

        const updateTagsFollow = await User.findOneAndUpdate(
            { _id: userID },
            {
                $pull: { following_tags: tagID },
            },
            { returnOriginal: false }
        )

        res.status(200).json({
            status: "success",
            message: "unfollowed successfully",
            tagfollowed: updateTagsFollow.following_tags || [],
        })
    } catch (error) {
        next(new BaseError(500, error.message))
    }
}

module.exports = { getTags, followTag, unfollowTag }
