const { App, LogLevel } = require('@slack/bolt');
const { OpenAI } = require('openai');

const env = process.env || {};
const BOT_TOKEN = env.BOT_TOKEN;
const SIGNING_SECRET = env.SIGNING_SECRET;
const APP_TOKEN = env.APP_TOKEN;
const API_ENDPOINT = env.API_ENDPOINT;
const SLASH_COMMAND = env.SLASH_COMMAND;

const OPENAI_API_KEY = env.OPENAI_API_KEY;
const ASSISTANT_ID = env.ASSISTANT_ID;

if (!BOT_TOKEN) {
  console.log('A bot token is empty.');
  sleep(60 * 1000).then(() => console.log('Service is getting stopped automatically'));
}

if (!SIGNING_SECRET) {
  console.log('A signing secret is empty.');
  sleep(60 * 1000).then(() => console.log('Service is getting stopped automatically'));
}

if (!APP_TOKEN) {
  console.log('An app token is empty.');
  sleep(60 * 1000).then(() => console.log('Service is getting stopped automatically'));
}

if (!API_ENDPOINT) {
  console.log('An api endpoint is empty.');
  sleep(60 * 1000).then(() => console.log('Service is getting stopped automatically'));
}

if (!SLASH_COMMAND) {
  console.log('A slash command is empty.');
  sleep(60 * 1000).then(() => console.log('Service is getting stopped automatically'));
}

if (!OPENAI_API_KEY) {
  console.log('An openai api key is empty.');
  sleep(60 * 1000).then(() => console.log('Service is getting stopped automatically'));
}

if (!ASSISTANT_ID) {
  console.log('An assistant id is empty.');
  sleep(60 * 1000).then(() => console.log('Service is getting stopped automatically'));
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY
});

const app = new App({
  token: BOT_TOKEN,
  signingSecret: SIGNING_SECRET,
  appToken: APP_TOKEN,
  logLevel: LogLevel.DEBUG,
  socketMode: true
});

const slackBotStart = async () => {
  try {
    await app.start();
    console.log('⚡️ Bolt app is running!');
  } catch (error) {
    console.error('Error occurred:', error);
    sleep(60 * 1000).then(() => console.log('Service is getting stopped automatically'));
  }
};

const sleep = (ms) => {
  return new Promise((r) => setTimeout(r, ms));
};

app.command(`/${SLASH_COMMAND}`, async ({ command, ack, say }) => {
  await ack();

  const userQuestion = command.text;

  try {
    const run = await openai.beta.threads.createAndRun({
      assistant_id: ASSISTANT_ID,
      thread: {
        messages: [{ role: 'user', content: userQuestion }]
      }
    });


    let runStatus = await openai.beta.threads.runs.retrieve(run.thread_id, run.id);

    while (runStatus.status !== 'completed') {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      runStatus = await openai.beta.threads.runs.retrieve(run.thread_id, run.id);
      console.log(runStatus);
    }

    await sleep(5000).then(() => console.log('The language model is generating a response.'));

    const messages = await openai.beta.threads.messages.list(run.thread_id);

    const lastMessageForRun = messages.data.filter((message) => message.run_id === run.id && message.role === 'assistant').pop();

    console.log(messages);
    console.log(lastMessageForRun);

    await say({
      response_type: 'in_channel',
      text: '🤖연말정산봇의 답변',
      blocks: [
        {
          type: 'divider'
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '💵 *2023년 귀속 연말정산* 💵'
          }
        },
        {
          type: 'divider'
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `🔷 *질문*\n${userQuestion}`
          }
        },
        {
          type: 'divider'
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `🔶 *답변*\n${lastMessageForRun.content[0].text.value}`
          }
        },
        {
          type: 'divider'
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '상세한 내용은 안내책자 참고'
          },
          accessory: {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '연말정산 안내 PDF 다운로드',
              emoji: true
            },
            value: 'click_me_123',
            url: 'https://www.nts.go.kr/comm/nttFileDownload.do?fileKey=143949cdeade82ab901580cd2f2a68ae',
            action_id: 'button-action'
          }
        }
      ]
    });
  } catch (error) {
    console.error(`Error fetching data from API: ${error.message}`, error);
    await say('Failed to fetch data from the API');
  }
});

slackBotStart();
