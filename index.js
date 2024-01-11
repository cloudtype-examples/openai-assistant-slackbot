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
    await ack();

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

        const runId = run.id;
        const threadId = run.thread_id;

        console.log(runId);
        console.log(threadId);

        let runStatus = await openai.beta.threads.runs.retrieve(
            threadId,
            runId
        );

        while (runStatus.status !== "completed") {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);
        }


        const messages = await openai.beta.threads.messages.list(
            `${threadId}`
        );

        const lastMessageForRun = messages.data
            .filter(
                (message) => message.run_id === runId && message.role === "assistant"
            )
            .pop();

        console.log(messages);
        console.log(lastMessageForRun);


        await say({
            response_type: 'in_channel',
            text: '🤖연말정산봇의 답변',
            blocks: [
                {
                    "type": "divider"
                },
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
                        "text": `🔶 *답변*\n${lastMessageForRun.content[0].text.value}`
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
        console.error(`Error fetching data from API: ${error.message}`, error);
        await say('Failed to fetch data from the API');
    }
});


(async () => {
    await app.start();
    console.log('⚡️ Bolt app is running!');
})();