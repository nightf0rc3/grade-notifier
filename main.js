const Browser = require('zombie');
const telegramBot = require('node-telegram-bot-api');
const config = require('./config.json');

const bot = new telegramBot(config.botToken, { polling: true });

const gradeMap = [];
let initialRun = true;

bot.on('message', (msg) => {
    console.log('[+] Message from ' + msg.chat.id);
    bot.sendMessage(msg.chat.id, 'hi');
});

function checkAndNotify() {
    console.log('[*] Checking for new grades...');
    const browser = new Browser();
    browser.visit(config.loginUrl, () => {
        browser.fill('username', config.user);
        browser.fill('password', config.password);
        browser.pressButton('Login', () => {
            browser.clickLink('.divlinks a:nth-child(4)', () => {
                browser.clickLink('#makronavigation ul li:nth-child(3) a', () => {
                    const table = browser.querySelectorAll('table tbody')[7].innerHTML;
                    const rows = table.split('<tr bgcolor="#EFEFEF">');
                    rows.forEach(row => {
                        const cols = row.split('<td ');
                        if (cols.length > 1) {
                            const examName = cols[5].replace('class="posrecords">', '').replace('</td>', '').trim();
                            const examGrade = cols[8].replace('align="center" class="posrecords">', '').replace('</td>', '').replace('&nbsp;', '').trim();
                            const examTry = cols[12].replace('align="center" class="posrecords">', '').replace('</td>', '').replace('&nbsp;', '').trim();
                            if (gradeMap[examName+examTry] === undefined) {
                                gradeMap[examName+examTry] = examGrade;
                                console.log('[+] New Grade found: ' + examGrade + ' in ' + examName);
                                const infoString = `New Grade in _${examName}_: *${examGrade}*`;
                                if (!initialRun) {
                                    notifyUser(infoString);
                                }
                            }
                        }
                    });
                    browser.tabs.closeAll()
                });
            });
        });
    });
}

function checkTime() {
    initialRun = false;
    const d = new Date();
    if (d.getHours() > config.activityStart && d.getHours() < config.activityEnd) {
        checkAndNotify();
    }
}

function notifyUser(message) {
    bot.sendMessage(config.telegramUserId, message, {
        parse_mode: 'Markdown'
    });
}

setInterval(checkTime, 1000 * 60 * config.interval);
checkAndNotify();