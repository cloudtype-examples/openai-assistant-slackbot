const { App, LogLevel } = require('@slack/bolt');
const { OpenAI } = require('openai')

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const app = new App({
    token: process.env.BOT_TOKEN,
    signingSecret: process.env.SIGNING_SECRET,
    appToken: process.env.APP_TOKEN,
    logLevel: LogLevel.DEBUG,
    socketMode: true,
});

app.command('/연말정산', async ({ command, ack, say }) => {

    const userQuestion = command.text;

    try {
        const run = await openai.beta.threads.createAndRun({
            assistant_id: `${process.env.ASSISTANT_ID}`,
            thread: {
                messages: [
                    { role: "user", content: `${userQuestion}` },
                ],
            },
        });

        console.log(run);
        console.log(typeof run);

        const apiResponse = await run.json();

        const runId = apiResponse.data[0].run_id;
        console.log(runId);

        const responseMessage = apiResponse.data[0].content[0].text.value;

        await ack();

        await say({
            response_type: 'in_channel',
            text: '🤖연말정산봇의 답변',
            blocks: [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "💵 *2023년 귀속 연말정산* 💵"
                    }
                },
                {
                    "type": "divider"
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": `🔷 *질문*\n${userQuestion}`
                    }
                },
                {
                    "type": "divider"
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": `🔶 *답변*\n${responseMessage}`
                    }
                },
                {
                    "type": "divider"
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "상세한 내용은 안내책자 참고"
                    },
                    "accessory": {
                        "type": "button",
                        "text": {
                            "type": "plain_text",
                            "text": "연말정산 안내 PDF 다운로드",
                            "emoji": true
                        },
                        "value": "click_me_123",
                        "url": "https://www.nts.go.kr/comm/nttFileDownload.do?fileKey=143949cdeade82ab901580cd2f2a68ae",
                        "action_id": "button-action"
                    }
                }
            ],
        });
    } catch (error) {
        console.error('Error fetching data from API:', error);
        await say('Failed to fetch data from the API');
    }
});


(async () => {
    await app.start();
    console.log('⚡️ Bolt app is running!');
})();