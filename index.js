const { App, LogLevel, HTTPReceiver } = require("@slack/bolt");
const { OpenAI } = require("openai");

const env = process.env || {};
const BOT_TOKEN = env.BOT_TOKEN;
const SIGNING_SECRET = env.SIGNING_SECRET;
const APP_TOKEN = env.APP_TOKEN;
const SLASH_COMMAND = env.SLASH_COMMAND;
const OPENAI_API_KEY = env.OPENAI_API_KEY;
const ASSISTANT_ID = env.ASSISTANT_ID;
const BOT_TITLE = env.BOT_TITLE || ''

const sleep = (ms) => {
  return new Promise((r) => setTimeout(r, ms));
};

(async () => {
  if (!BOT_TOKEN) {
    console.log(
      `Environment variable 'BOT_TOKEN' is required. Service will be stopped automatically in 60s`
    );
    await sleep(60 * 1000);
  }

  if (!SIGNING_SECRET) {
    console.log(
      `Environment variable 'SIGNING_SECRET' is required. Service will be stopped automatically in 60s`
    );
    await sleep(60 * 1000);
  }

  if (!APP_TOKEN) {
    console.log(
      `Environment variable 'APP_TOKEN' is required. Service will be stopped automatically in 60s`
    );
    await sleep(60 * 1000);
  }

  if (!SLASH_COMMAND) {
    console.log(
      `Environment variable 'SLASH_COMMAND' is required. Service will be stopped automatically in 60s`
    );
    await sleep(60 * 1000);
  }

  if (!OPENAI_API_KEY) {
    console.log(
      `Environment variable 'OPENAI_API_KEY' is required. Service will be stopped automatically in 60s`
    );
    await sleep(60 * 1000);
  }

  if (!ASSISTANT_ID) {
    console.log(
      `Environment variable 'ASSISTANT_ID' is required. Service will be stopped automatically in 60s`
    );
    await sleep(60 * 1000);
  }

  const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
  });

  const app = new App({
    token: BOT_TOKEN,
    signingSecret: SIGNING_SECRET,
    appToken: APP_TOKEN,
    logLevel: LogLevel.DEBUG,
    port: 3000,
    receiver: new HTTPReceiver({
        signingSecret: SIGNING_SECRET,
        unhandledRequestHandler: async ({ logger, response }) => {
          logger.info('Acknowledging this incoming request because 20 seconds already passed...');
          response.writeHead(200);
          response.end();
        },
        unhandledRequestTimeoutMillis: 20000,
      }),
  });

  app.command(`/${SLASH_COMMAND}`, async ({ command, ack, say }) => {
    await ack();

    const user = command.user_name;
    const userQuestion = command.text;

    try {
      const run = await openai.beta.threads.createAndRun({
        assistant_id: ASSISTANT_ID,
        thread: {
          messages: [{ role: "user", content: userQuestion }],
        },
      });

      let runStatus = await openai.beta.threads.runs.retrieve(
        run.thread_id,
        run.id
      );

      let response = null;

      for (let i = 0; i < 400; i++) {
        runStatus = await openai.beta.threads.runs.retrieve(
          run.thread_id,
          run.id
        );

        if (runStatus.status === "completed") {
          const messages = await openai.beta.threads.messages.list(
            run.thread_id
          );

          response = messages.data.find(
            (message) =>
              message.run_id === run.id && message.role === "assistant"
          );

          if (response?.content?.length > 0 && response.content[0].text.value) {
            break;
          }
        }

        await sleep(300);
      }


      await say({
        response_type: "in_channel",
        blocks: [
          {
            type: 'divider'
          },
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: BOT_TITLE
            }
          }, 
          {
            "type": "context",
            "elements": [
              {
                type: 'plain_text',
                text: `@${user}`
              }
            ]
          },        
          {
            type: 'divider'
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `🔷 *질문*\n${userQuestion}`,
            },
          },
          {
            type: "divider",
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `🔶 *답변*\n${
                response
                  ? response.content[0].text.value
                  : `답변을 가져올 수 없습니다.`
              }`,
            },
          },
        ],
      });
    } catch (error) {
      console.error(`Error fetching data from API: ${error.message}`, error);
      await say(`오류: ${error.message}`);
    }
  });

  try {
    await app.start();
    console.log("⚡️ Bot is running!");
  } catch (error) {
    console.log(`Error occurred: ${error.message}`);
    console.error(error);
    await sleep(60 * 1000);
  }
})();