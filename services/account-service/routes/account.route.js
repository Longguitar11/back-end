const express = require("express")
const {
    signupSchema,
    signinSchema,
    forgotPasswordSchema,
    activateAccountSchema,
    createNewPwdSchema,
    changePasswordSchema,
    updateProfileSchema,
} = require("../utils/validate.js")
const { celebrate, errors, Segments } = require("celebrate")
const accountController = require("../controllers/account.controller")
const { verifyToken } = require("../utils/verifyToken")
const { upload } = require("../utils/cloudinary.js")
const router = express.Router()

router.post(
    "/signup",
    celebrate({
        body: signupSchema,
    }),
    accountController.signup
)

router.post(
    "/signin",
    celebrate({
        body: signinSchema,
    }),
    accountController.signin
)

router.post(
    "/forgot-password",
    celebrate({
        body: forgotPasswordSchema,
    }),
    accountController.forgotPassword
)

router.post(
    "/activate",
    celebrate({ body: activateAccountSchema }),
    accountController.activateAccount
)

router.post(
    "/create-new-password",
    celebrate({ body: createNewPwdSchema }),
    accountController.createNewPassword
)

// router.use(verifyToken)
router.post(
    "/change-password",
    celebrate({ body: changePasswordSchema }),
    accountController.changePassword
)

router.post(
    "/update-profile",
    upload.single("avatar"),
    celebrate({ body: updateProfileSchema }),
    accountController.updateProfile
)

module.exports = router
