const ConnectedUser = require("../models/connectedUser.model")
const Notification = require("../models/notification.model")
const { consumeMessageAMQP } = require("./rabbitmq")

class NotificationService {
    run() {
        consumeMessageAMQP({ queueName: "notification" }, async (message) => {
            const parseMessage = JSON.parse(message)
            // save notification
            const notification = await Notification.create(parseMessage)
            console.log(
                "🚀 ~ file: rabbitmq.service.js:55 ~ consumeMessageAMQP ~ notification:",
                notification
            )

            // emit notification to client
            // find user in connected users database, if found, emit notification to client
            const user = await ConnectedUser.findById(notification.recipient)
            if (user) {
                global._io.to(user.socketID).emit("notification", notification)
            }
        })

        // unlike action
        consumeMessageAMQP({ queueName: "unlike" }, async (message) => {
            const { type, sender, comment, post } = JSON.parse(message)
            const queryObj = {
                comment: {
                    type: "like_comment",
                    sender,
                    comment,
                },
                post: {
                    type: "like_post",
                    sender,
                    post,
                },
            }

            // delete notification
            await Notification.findOneAndDelete(queryObj[type])
        })

        // delete action
        consumeMessageAMQP({ queueName: "delete" }, async (message) => {
            const { type, sender, comment, post } = JSON.parse(message)
            const queryObj = {
                comment: {
                    type: "comment",
                    sender,
                    comment,
                },
                post: {
                    post,
                },
            }

            // delete notification
            if (type === "comment") await Notification.findOneAndDelete(queryObj[type])
            if (type === "post") await Notification.deleteMany(queryObj[type])
        })
    }
}

module.exports = new NotificationService()
