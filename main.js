const puppeteer = require('puppeteer');
const telegramBot = require('node-telegram-bot-api');
const config = require('./config.json');
const _ = require('lodash');

const bot = new telegramBot(config.botToken, { polling: true });

const gradeMap = [];
let initialRun = true;

async function navigateByClick(page, selector) {
  return Promise.all([
    page.waitForNavigation(),
    page.click(selector)
  ]);
}

async function checkAndNotify() {
  console.log('[*] Checking for new grades...');
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(config.loginUrl);
  await page.type('#username', config.user);
  await page.type('#password', config.password);
  await navigateByClick(page, 'input[name=submit]');
  console.log('[*] Logged in');
  await page.goto(config.examUrl);
  await navigateByClick(page, '.liste li:nth-child(3) a');
  await navigateByClick(page, 'li.treelist a:nth-child(3)');
  const rows = await page.evaluate(`
    $(".tabelle1, .tabelle1_alignright").map(function() {
      return this.innerText;
    }).get()
  `);
  const examResults = _.chunk(rows, 6);
  examResults.forEach((ex) => {
    const examName = ex[0];
    const examGrade = ex[3];
    const examTry = ex[5];
    if (gradeMap[examName+examTry] === undefined) {
      gradeMap[examName+examTry] = examGrade;
      console.log('[+] New Grade found: ' + examGrade + ' in ' + examName);
      const infoString = `New Grade in _${examName}_: *${examGrade}*`;
      if (!initialRun) {
          notifyUser(infoString);
      }
    }
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