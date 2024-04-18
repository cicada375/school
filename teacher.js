#!/usr/bin/env node

var amqp = require('amqplib/callback_api');
const readline = require('readline');
const rl=readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question("Введіть рівняння:\n", (msg) =>{
    amqp.connect('amqp://localhost', function(error0, connection) {
        if (error0) {
            throw error0;
        }
        connection.createChannel(function(error1, channel) {
        if (error1) {
            throw error1;
        }
        const queue = 'to_server_math';
        const grades_queue = 'teacher_grade'
        channel.assertQueue(queue, {
            durable: true
        });
        channel.assertQueue(grades_queue,{
            durable: true
        });

        channel.sendToQueue(queue, Buffer.from(msg), {
            persistent: true
        });
        console.log(" [x] Sent %s", msg);

        let totalStudents = 2; //кількість учнів
        let receivedAnswers = 0; //кількість отриманих відповідей

        channel.consume(grades_queue, function (msg) {
            if (msg.content) {
                console.log("\x1b[0m [x] Received %s", msg.content);
                receivedAnswers++;
                const data = JSON.parse(msg.content.toString());
                let grade = data[0];
                grade=parseInt(grade);
                let color = '';//колір консолі в залежності від правильності відповідей учня
                if(grade>75){
                    color='\x1b[32m'
                }
                else if(grade >45){
                    color='\x1b[33m'
                }
                else {
                    color='\x1b[31m'
                }
                const answers = data[1];
                const name = data[2];
                console.log(color + " [x] %s: %d        (Answers: %s)", name, grade, answers);
                color = '\x1b[0m' //повернення кольору до білого
                // перевірка, чи отримані всі відповіді від учнів
                if (receivedAnswers === totalStudents) {
                        console.log('\x1b[0mОтримано відповіді від всіх учнів. Завершення роботи.');
                        setTimeout(function () {
                            connection.close();
                            process.exit(0);
                        }, 500);
                    }
            }
        }, {
            noAck: true
        });
    });

    });
});