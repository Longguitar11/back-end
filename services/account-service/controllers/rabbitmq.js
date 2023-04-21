const amqp = require("amqplib")

const amqp_docker_url = "amqp://localhost"
const amqp_cloud_url =
    "amqps://gntkvuew:WvwnFyjIQwnuKK1z5SY-QvH0vFn1iGYb@armadillo.rmq.cloudamqp.com/gntkvuew"

const sendMessageAMQP = async ({ message, queueName }) => {
    console.log("🚀 ~ file: rabbitmq.js:6 ~ sendMessageAMQP ~ queueName:", queueName)
    console.log("🚀 ~ file: rabbitmq.js:6 ~ sendMessageAMQP ~ message:", message)
    try {
        // create connection
        const connection = await amqp.connect(amqp_cloud_url)
        // create chanel
        const chanel = await connection.createChannel()
        // create queue
        await chanel.assertQueue(queueName, {
            durable: false,
        })

        // send message
        await chanel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)))
    } catch (error) {
        console.log("🚀 ~ file: rabbitmq.js:16 ~ sendMessage ~ error:", error)
    }
}

const receiveMessageAMQP = async ({ queueName }) => {
    try {
        // create connection
        const connection = await amqp.connect(amqp_cloud_url)
        // create chanel
        const chanel = await connection.createChannel()
        // create queue
        await chanel.assertQueue(queueName, {
            durable: false,
        })

        // receive message
        await chanel.consume(
            queueName,
            (message) => {
                console.log("Consume message >>>>>>>>>>", message.content.toString())
            },
            { noAck: true }
        )
    } catch (error) {
        console.log("🚀 ~ file: rabbitmq.js:16 ~ sendMessage ~ error:", error)
    }
}

module.exports = { sendMessageAMQP }
