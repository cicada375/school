#!/usr/bin/env node

const amqp = require('amqplib/callback_api');
let answs = [];
amqp.connect('amqp://localhost', function(error0, connection) {
    if (error0) {
        throw error0;
    }
    connection.createChannel(function(error1, channel) {
        if (error1) {
            throw error1;
        }

        const studentExchange = 'to_students_math';
        const teacherQueue = 'to_server_math';
        const serverGradeQueue = "server_grade"
        // Створення обмінників та черги для вчителя
        channel.assertQueue(teacherQueue, {
            durable: true
        });
        channel.assertExchange(studentExchange, 'fanout', {
            durable: true
        });
        channel.assertQueue(serverGradeQueue, {
            durable: true
        });
        channel.assertQueue('', {
            durable: true
        }, function(error2, q) {
            if (error2) {
                throw error2;
            }
            console.log(" [*] Waiting for messages from teacher in %s. To exit press CTRL+C", teacherQueue);
            channel.bindQueue(q.queue, studentExchange, '');

            // Обробник повідомлень від вчителя
            channel.consume(teacherQueue, function(msg) {
                if (msg.content) {
                    const equations = msg.content.toString().split(',');
                    channel.publish(studentExchange, '', Buffer.from(equations.join(',')));
                    answs = calc(equations);

                }
            }, {
                noAck: true
            });

            // Обробник повідомлень з оцінками учнів
            channel.consume(serverGradeQueue, function(msg) {
                if (msg.content) {
                    const data = JSON.parse(msg.content.toString());//отримані оцінки та ім'я від pupil-а
                    const answers = data[0];
                    const name = data[1];
                    const grade = calculateGrade(answers); //обрахунок оцінки відносно правильних відповідей та відповідей учня
                    console.log(" [x] Received answers from student and calculated grade:", answers, grade);
                    const studentGrade = JSON.stringify([grade, answers, name]);
                    channel.sendToQueue("teacher_grade", Buffer.from(studentGrade));
                }
            }, {
                noAck: true
            });

        });
    });
});

// Функція для емуляції відповідей учнів
function calc(equations) {
    const answers = [];
    for (let i = 0; i < equations.length; i++) {
        answers[i] = eval(equations[i]);
    }
    return answers;
}


function calculateGrade(receivedAnswers) {
    let correctAnswers = 0;
    for (let i = 0; i < receivedAnswers.length; i++) {
        // Порівняння кожної отриманої відповіді з правильною
        if (receivedAnswers[i] == answs[i]) {
            correctAnswers++;
        }
    }
    // Підрахунок оцінки на основі кількості правильних відповідей
    const totalQuestions = answs.length;
    return (correctAnswers / totalQuestions) * 100;
}
