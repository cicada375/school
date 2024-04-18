#!/usr/bin/env node

var amqp = require('amqplib/callback_api');
const readline = require('readline');

amqp.connect('amqp://localhost', function(error0, connection) {
    if (error0) {
        throw error0;
    }
    connection.createChannel(function(error1, channel) {
        if (error1) {
            throw error1;
        }
        var exchange = 'to_students_math';

        channel.assertExchange(exchange, 'fanout', {
            durable: true
        });

        channel.assertQueue('', {
            exclusive: true
        }, function(error2, q) {
            if (error2) {
                throw error2;
            }
            console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", q.queue);
            channel.bindQueue(q.queue, exchange, '');

            // Створення інтерфейсу readline
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });


            channel.consume(q.queue, async function(msg) {
                if (msg.content) {
                    console.log(" [x] %s", msg.content.toString());
                    const equation = msg.content.toString().split(',');
                    // Отримання відповідей від користувача
                    let answers = await getAnswers(rl, equation);
                    console.log("Отримані відповіді:", answers);
                    answers = JSON.stringify([answers, "Pupil1"]);
                    channel.sendToQueue("server_grade", Buffer.from(answers), {
                        durable: true
                    })
                }
            }, {
                noAck: true
            });
        });
    });
});

// для отримання відповідей від користувача
function getAnswers(rl, equations) {
    return new Promise((resolve, reject) => {
        const answers = [];
        let i = 0;
        const processAnswer = () => {
            console.log(equations[i]);
            rl.question('Введіть свою відповідь: ', (answer) => {
                answers.push(answer);
                i++;
                if (i < equations.length) {
                    processAnswer(); // Рекурсивно обробляємо наступний рядок
                } else {
                    resolve(answers); // Повертаємо масив відповідей
                }
            });
        };
        processAnswer(); // Починаємо процес отримання відповідей
    });
}
