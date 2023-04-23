const Tag = require("../models/tag.model")

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

module.exports = { getTags }
