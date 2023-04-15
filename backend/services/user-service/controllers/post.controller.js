const Post = require("../models/post.model")
const User = require("../models/user.model")
const BaseError = require("../utils/error-handling/baseError.js")
const Tag = require("../models/tag.model")
const {
    startOfWeekUtc,
    endOfWeekUtc,
    startOfMonthUtc,
    endOfMonthUtc,
    startOfYearUtc,
    endOfYearUtc,
} = require("../utils/moment")
const { sendMessageAMQP } = require("./rabbitmq")

// -----------------------CREATE NEW POST-----------------------------------
const createPost = async (req, res, next) => {
    try {
        const { id } = req.user
        const { title, content, tags, timeToRead } = req.body

        // create new post
        const newPost = new Post({
            author: id,
            title,
            content,
            tags,
            time_to_read: timeToRead,
        })
        await newPost.save()

        res.status(200).json({
            status: "success",
            message: "Post created",
            data: { newPost },
        })
    } catch (error) {
        next(new BaseError(500, error.message))
    }
}

// -----------------------GET POSTS-----------------------------------
const getPostsRelevant = async (req, res, next) => {
    // maybe then change to get user following post
    try {
        const { id } = req.user
        const { limit = 10 } = req.query

        // get user following tags
        let followingTags = await User.findById(id, "following_tags")

        // if there no tags set some tags has many post
        if (followingTags.length === 0) {
            followingTags = await Tag.find().sort({ count_post: -1 }).limit(5).select("_id")
        }

        const posts = await Post.find({ tags: { $in: followingTags } })
            .populate("author", "username avatar")
            .populate("tags", "name")
            .sort({ createdAt: -1 })

        res.status(200).json({
            status: "success",
            message: "Posts fetched",
            data: { posts },
        })
    } catch (error) {
        next(new BaseError(500, error.message))
    }
}

const getPostsLatest = async (req, res, next) => {
    try {
        const { limit = 10 } = req.query
        const posts = await Post.find()
            .sort({ createdAt: "desc" })
            .limit(limit)
            .populate("author", "username avatar")
            .populate("tags", "name")

        res.status(200).json({
            status: "success",
            message: "Posts fetched",
            data: { posts },
        })
    } catch (error) {
        next(new BaseError(500, error.message))
    }
}

// filter by week, month, year
const getPostsTop = async (req, res, next) => {
    try {
        const { limit, filter } = req.query
        const queryObj = {
            week: { createdAt: { $gte: startOfWeekUtc, $lte: endOfWeekUtc } },
            month: { createdAt: { $gte: startOfMonthUtc, $lte: endOfMonthUtc } },
            year: { createdAt: { $gte: startOfYearUtc, $lte: endOfYearUtc } },
        }

        const posts = await Post.find(queryObj[filter])
            .sort({ count: -1 })
            .limit(limit)
            .populate("post_id", "author title tags time_to_read")
            .populate("author", "username avatar")
            .populate("tags", "name")

        res.status(200).json({
            status: "success",
            message: "Posts fetched",
            data: { posts },
        })
    } catch (error) {
        next(new BaseError(500, error.message))
    }
}

// ----------------------- UPDATE POST (CONTENT/TITLE) -----------------------------------
const updatePost = async (req, res, next) => {
    try {
        const { id } = req.user
        const { postID } = req.params

        const _post = await Post.findById(postID).select("author")

        // check if user is the author of the post
        if (_post.author.toString() !== id) {
            return next(new BaseError(401, "Unauthorized"))
        }

        const post = await Post.findByIdAndUpdate(postID, req.body)

        res.status(200).json({
            status: "success",
            message: "Post updated",
            data: { post },
        })
    } catch (error) {
        next(new BaseError(500, error.message))
    }
}

// ----------------------- DELETE A POST-----------------------------------
const deletePost = async (req, res, next) => {
    try {
        const { id } = req.user
        const { postID } = req.params

        // check if user is author, then allow delete
        const post = await Post.findOne({ _id: postID })
        if (post.author.toString() !== id) {
            return next(new BaseError(401, "Unauthorized"))
        }

        await Post.findByIdAndDelete(postID)

        res.status(200).json({
            status: "success",
            message: "Delete post successfully",
        })
    } catch (error) {
        next(new BaseError(500, error.message))
    }
}

// -----------------------LIKE POST-----------------------------------
const likePost = async (req, res, next) => {
    try {
        const { id } = req.user
        const { postID } = req.params

        const post = await Post.updateOne(
            { _id: postID, likes: { $ne: id } },
            {
                $addToSet: { likes: id },
                $inc: { like_count: 1 },
            }
        )

        if (post.modifiedCount === 0) {
            return next(new BaseError(400, "Fail to like post, unkown error"))
        }

        res.status(200).json({
            status: "success",
            message: "Post liked",
        })

        const sender = await User.findById(id, "username")
        const { author } = await Post.findById(postID, "author").populate("author", "_id")
        // send notification to author
        const message = {
            type: "like",
            recipient: author._id,
            sender: id,
            post: postID,
            message: `${sender.username} like your post`,
        }

        sendMessageAMQP({ queueName: "notification", message })
    } catch (error) {
        next(new BaseError(500, error.message))
    }
}

// -----------------------UNLIKE POST-----------------------------------
const unlikePost = async (req, res, next) => {
    try {
        const { id } = req.user
        const { postID } = req.params

        const post = await Post.updateOne(
            { _id: postID, likes: { $in: [id] } },
            {
                $pull: { likes: id },
                $inc: { like_count: -1 },
            }
        )

        if (post.modifiedCount === 0) {
            return next(new BaseError(400, "Fail to unlike post, unkown error"))
        }

        res.status(200).json({
            status: "success",
            message: "Post unliked",
        })

        // remove notification in database
    } catch (error) {
        next(new BaseError(500, error.message))
    }
}

module.exports = {
    createPost,
    updatePost,
    deletePost,
    likePost,
    unlikePost,
    getPostsRelevant,
    getPostsLatest,
    getPostsTop,
}
