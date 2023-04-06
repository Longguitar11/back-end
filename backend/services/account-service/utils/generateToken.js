const jwt = require("jsonwebtoken")
const crypto = require("crypto")
require("dotenv").config()
const { ACTIVATE_TOKEN_SECRET, RESET_TOKEN_SECRET, ACCESS_TOKEN_SECRET } = process.env

const jwtSecretsType = {
    accessToken: ACCESS_TOKEN_SECRET,
    activateToken: ACTIVATE_TOKEN_SECRET,
    resetToken: RESET_TOKEN_SECRET,
}

const genJwtToken = (payload, type, expiresIn) => {
    const secret = jwtSecretsType[type]
    const options = { expiresIn }
    return jwt.sign(payload, secret, options)
}

module.exports = { genJwtToken }
