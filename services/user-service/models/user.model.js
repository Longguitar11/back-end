const mongoose = require("mongoose")
const bcrypt = require("bcrypt")
const crypto = require("crypto")

const userSchema = mongoose.Schema(
    {
        username: {
            type: String,
            unique: true,
        },
        email: {
            type: String,
            unique: true,
        },
        password: {
            type: String,
            select: false,
        },
        activate_token: String,
        activate_token_expire: Date,
        reset_pwd_token: String,
        reset_pwd_token_expire: Date,
        refresh_token: String,
        change_password_at: Date,
        fullname: String,
        bio: String,
        avatar: {
            type: String,
            default:
                "https://res.cloudinary.com/khait/image/upload/v1680667931/forum_user_avatar/user_s80crg.png",
        },
        gender: {
            type: String,
            enum: ["male", "female"],
        },
        dob: String,
        address: String,
        job: String,
        status: {
            type: String,
            enum: ["pending", "activated", "disabled"],
            default: "pending",
        },
        following_tags: [
            {
                ref: "Tag",
                type: mongoose.Types.ObjectId,
            },
        ],
    },
    { timestamps: true }
)

userSchema.pre("save", function (next) {
    // Only run this function if password was moddified (not on other update functions)
    if (!this.isModified("password")) return next()
    // Hash password with strength of 12
    this.password = bcrypt.hashSync(this.password, 12)
    next()
})

//  run on password changed
userSchema.pre("save", function (next) {
    if (!this.isModified("password") || this.isNew) return next()
    this.passwordChangeAt = Date.now() - 1000
    next()
})

// method check password valid
userSchema.methods.verifyPassword = function (inputPwd, currentPwd) {
    return bcrypt.compareSync(inputPwd, currentPwd)
}

userSchema.methods.createHashToken = function (type) {
    const hashedToken = crypto.randomBytes(32).toString("hex")
    if (type === "activateToken") {
        this.activate_token = crypto.createHash("sha256").update(hashedToken).digest("hex")
        this.activate_token_expire = Date.now() + 10 * 60 * 1000000 // 10 minutes
    }

    if (type === "resetToken") {
        this.reset_pwd_token = crypto.createHash("sha256").update(hashedToken).digest("hex")
        this.reset_pwd_token_expire = Date.now() + 10 * 60 * 1000 // 10 minutes
    }

    return hashedToken
}

const User = mongoose.model("User", userSchema)
module.exports = User
