const amqp = require('amqplib');

async function connectQueue() {
    const connection = await amqp.connect('amqp://localhost');
    const channel = await connection.createChannel();
    const queue = 'task_queue';

    await channel.assertQueue(queue, {
        durable: true,
    });

    return { connection, channel, queue };
}

async function sendToQueue(data) {
    const { channel, queue } = await connectQueue();
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)), {
        persistent: true,
    });
    console.log(' [x] Sent %s', data);
}

async function receiveFromQueue() {
    const { connection, channel, queue } = await connectQueue();
    channel.consume(queue, (msg) => {
        if (msg !== null) {
            console.log(' [x] Received %s', msg.content.toString());
            channel.ack(msg);
        }
    });
}

module.exports = { sendToQueue, receiveFromQueue };