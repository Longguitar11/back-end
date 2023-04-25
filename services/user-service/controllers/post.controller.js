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
const Bookmark = require("../models/bookmark.model")

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

        // increase count post in tag
        tags.forEach(async (tagId) => {
            const tag = await Tag.updateOne(
                { _id: tagId },
                {
                    $inc: { count_post: 1 },
                },
            )

            if (tag.modifiedCount === 0) {
                return next(new BaseError(400, "Fail to increase post count in tags, unkown error"))
            }
        });


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

// ----------------------- GET POST DETAIL -----------------------------------
// const getPostDetail = async (req, res, next) => {
//     try {
//         const {postID} = req.params

//         const post = await Post.findById(postID).populate("author", "username avatar").populate("tags", "name")
//     } catch (error) {
//         next(new BaseError(500, error.message))
//     }
// }

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
            type: "like_post",
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

        // send message to queue to remove notification
        const message = {
            type: "post",
            sender: id,
            post: postID,
        }

        sendMessageAMQP({ queueName: "unlike", message })
    } catch (error) {
        next(new BaseError(500, error.message))
    }
}

// ----------------------- CHANGE POST PRIVACY -----------------------------------
const changePostPrivacy = async (req, res, next) => {
    try {
        const { id } = req.user
        const { postID } = req.params
        const { privacy } = req.body

        const post = await Post.findOne({ _id: postID, author: id })
        if (!post) {
            return next(new BaseError(400, "Post not found"))
        }

        post.privacy = privacy
        await post.save()

        res.status(200).json({
            status: "success",
            message: "Post privacy changed",
        })
    } catch (error) {
        next(new BaseError(500, error.message))
    }
}

// ----------------------- BOOKMARK POST -----------------------------------
const bookmarkPost = async (req, res, next) => {
    try {
        const { id } = req.user
        const { postID } = req.params

        // check if post already bookmarked
        const post = await Bookmark.findById(postID)
        if (post) {
            return next(new BaseError(400, "Post already bookmarked"))
        }

        // check post privacy
        const _post = await Post.findById(postID, "privacy")
        if (_post.privacy === "private") {
            return next(new BaseError(400, "Cannot bookmark this post"))
        }

        const bookmark = await Bookmark.create({ user: id, post: postID })

        res.status(200).json({
            status: "success",
            message: "Post bookmarked",
        })
    } catch (error) {
        next(new BaseError(500, error.message))
    }
}

// ----------------------- UNBOOKMARK POST -----------------------------------
const unbookmarkPost = async (req, res, next) => {
    try {
        const { id } = req.user
        const { postID } = req.params

        // check if post not bookmarked
        const post = await Bookmark.findById(postID)
        if (!post) {
            return next(new BaseError(400, "Bad request"))
        }

        await Bookmark.findOneAndDelete({ post: postID })

        res.status(200).json({
            status: "success",
            message: "Post unbookmarked",
        })
    } catch (error) {
        next(new BaseError(500, error.message))
    }
}

// ----------------------- GET BOOKMARK POSTS -----------------------------------
const getBookmarks = async (req, res, next) => {
    try {
        const { id } = req.user

        const bookmarks = await Bookmark.find({ user: id }).populate(
            "post",
            "title author time_to_read tags"
        )

        if (!bookmarks) {
            return next(new BaseError(400, "No bookmarks founded"))
        }

        res.status(200).json({
            status: "success",
            message: "Get bookmarks successfully",
            data: bookmarks,
        })
    } catch (error) {
        next(new BaseError(500, error.message))
    }
}

// ----------------------- GET USERS WHO LIKE A POST-----------------------------------
// const getPostLikes = async (req, res, next) => {
//     try {
//         const { postID } = req.params

//         const
//     } catch (error) {
//         next(new BaseError(500, error.message))
//     }
// }

module.exports = {
    createPost,
    updatePost,
    deletePost,
    likePost,
    unlikePost,
    getPostsRelevant,
    getPostsLatest,
    getPostsTop,
    changePostPrivacy,
    unbookmarkPost,
    bookmarkPost,
    getBookmarks,
}
