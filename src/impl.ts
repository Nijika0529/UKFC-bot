import * as fs from 'fs/promises'; // 使用异步的 fs/promises
import * as iconv from 'iconv-lite';
import * as path from 'path';
import { execFile } from 'child_process';
import cron from 'node-cron';
import {mapper, LagrangeContext, PrivateMessage, GroupMessage, plugins, AddFriendOrGroupMessage, ApproveMessage, Message} from 'lagrange.onebot';
import { MessageRecord } from './types'; // 导入我们定义的类型
import { getWeather } from './mcp';

const BOT_QQ = 3880559396;

/**
 * 解析原始消息数据，转换成标准的消息记录对象
 * @param c LagrangeContext，用于获取回复消息
 * @param messageData 从 c.getMsg() 获取的原始消息数据
 * @returns 返回 MessageRecord 对象，如果消息应被忽略（如图片），则返回 null
 */
export async function parseMessageRecord(c: LagrangeContext<GroupMessage>, messageData: any): Promise<MessageRecord | null> {
    // 检查是否为图片消息
    if (Array.isArray(messageData.message)) {
        const hasImage = messageData.message.some(msgPart => msgPart.type === "image");
        if (hasImage) {
            console.log("检测到图片消息，不进行记录。");
            return null;
        }
    }

    const correctedTimestamp = messageData.time + 8 * 60 * 60;
    const record: MessageRecord = {
        sender: messageData.sender.nickname,
        user_id: messageData.sender.user_id,
        time: new Intl.DateTimeFormat('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'Asia/Shanghai'
        }).format(new Date(correctedTimestamp * 1000)),
        content: "",
        replyName: null,
        replyText: null
    };

    let replyId: string | null = null;
    let textParts: string[] = [];

    if (Array.isArray(messageData.message)) {
        for (const msgPart of messageData.message) {
            if (msgPart.type === "reply" && msgPart.data?.id) {
                replyId = msgPart.data.id;
            } else if (msgPart.type === "text" && msgPart.data?.text) {
                textParts.push(msgPart.data.text.trim());
            }
        }
    }
    
    record.content = textParts.join(" ");

    if (replyId) {
        const replyResponse = await c.getMsg(Number(replyId));
        if (replyResponse && 'retcode' in replyResponse && replyResponse.retcode === 0 && replyResponse.data) {
            const replyData = replyResponse.data;
            record.replyName = `@${replyData.sender.nickname}`;
            if (Array.isArray(replyData.message)) {
                record.replyText = replyData.message
                    .filter((m: any) => m.type === "text")
                    .map((m: any) => m.data.text.trim())
                    .join(" ");
            }
        }
    }

    return record;
}

/**
 * 将消息记录保存到当天的日志文件中
 * @param record 解析后的消息记录
 */
export async function saveRecordToFile(record: MessageRecord, groupId: number | string): Promise<void> {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');

    // 改动点: 在文件路径中加入 groupId 作为子目录
    // 使用 String(groupId) 确保路径部分是字符串
    const logFile = path.join(__dirname, '..', 'logs', String(groupId), `${year}-${month}-${day}.json`);
    
    let logs: MessageRecord[] = [];
    try {
        // fs.mkdir 的 recursive: true 属性会自动创建所有不存在的父目录（包括新的群号目录）
        await fs.mkdir(path.dirname(logFile), { recursive: true });
        const fileContent = await fs.readFile(logFile, "utf-8");
        logs = JSON.parse(fileContent);
    } catch (error) {
        // 文件不存在或内容为空/错误，是正常情况，继续执行
    }

    logs.push(record);
    await fs.writeFile(logFile, JSON.stringify(logs, null, 2), "utf-8");
    console.log(`已记录到 ${logFile}:`, record);
}

/**
 * 检查消息是否@了机器人，并做出回应
 * @param c LagrangeContext
 * @param messageData 原始消息数据
 */
export async function handleBotMention(c: LagrangeContext<GroupMessage>, messageData: any): Promise<void> {
    const isAtBot = Array.isArray(messageData.message) && 
                    messageData.message.some((m: any) => m.type === "at" && m.data?.qq == BOT_QQ);
    
    if (isAtBot) {
        await c.sendGroupMsg(c.message.group_id, "凉薄还没开发好他的bot，目前没有功能");
    }
}

const ALLOWED_COMMANDS = new Set(['ls', 'cat', 'ping', 'whoami', 'date', 'echo', 'whereis', 'which','ifconfig','ipconfig']);

        // 4. 使用 execFile 执行命令，这可以防止命令注入！
        // execFile 不会启动一个 shell，参数会被安全地传递。
        // 例如，用户输入 "ls; rm -rf /" 会被解析为 command='ls;' args=['rm', ...], 
        // 由于 'ls;' 不在白名单中，执行会被拒绝。
export function executeSafeCommand(fullCommandString: string): Promise<string> {
    return new Promise((resolve) => {
        const parts = fullCommandString.trim().split(/\s+/);
        const command = parts[0];
        const args = parts.slice(1);

        if (!ALLOWED_COMMANDS.has(command)) {
            resolve(`❌ 命令 "${command}" 不被允许执行。`);
            return;
        }

        // 2. 在 options 中，将 encoding 设置为 'buffer'
        //    这样 stdout 和 stderr 就会是 Buffer 对象，而不是字符串
        execFile(command, args, { timeout: 5000, cwd: '/', encoding: 'buffer' }, (error, stdout, stderr) => {
            if (error) {
                // error 对象也需要解码
                const errorMessage = iconv.decode(Buffer.from(error.message), 'gbk');
                resolve(`执行出错: ${errorMessage}`);
                return;
            }
            if (stderr && stderr.length > 0) {
                // 3. 使用 iconv.decode 将 stderr Buffer 解码为 gbk 字符串
                const decodedStderr = iconv.decode(stderr, 'gbk');
                resolve(`命令执行有误: \n${decodedStderr}`);
                return;
            }

            // 4. 使用 iconv.decode 将 stdout Buffer 解码为 gbk 字符串
            const decodedStdout = iconv.decode(stdout, 'gbk');

            const singleLineOutput = decodedStdout.replace(/\s+/g, ' ').trim();
            const output = singleLineOutput.substring(0, 1500);
            resolve(output);
        });
    });
}


/**
 * 执行一个安全的基础 shell 命令
 * @param fullCommandString 用户输入的完整指令，例如 "ls -l /home"
 * @returns 返回一个包含 stdout 或 stderr 的 Promise
 */
export async function handlePossibleCommand(c: LagrangeContext<GroupMessage>): Promise<void> {
    const plainText = c.message?.raw_message?.trim() || '';

    if (plainText === '') {
        return; // 如果消息为空，则不处理
    }

    // 将消息按空格分割，获取第一个词
    const parts = plainText.split(/\s+/);
    const firstWord = parts[0];

    // 检查第一个词是否存在于我们的命令白名单中
    if (ALLOWED_COMMANDS.has(firstWord)) {
        console.log(`[群: ${c.message.group_id}] 检测到指令: ${plainText}`);
        try {
            // 将完整的消息文本作为指令执行
            const result = await executeSafeCommand(plainText);
            await c.sendGroupMsg(c.message.group_id, result);
        } catch (cmdError) {
            console.error(`[群: ${c.message.group_id}] 执行指令时发生错误:`, cmdError);
            await c.sendGroupMsg(c.message.group_id, '糟糕，执行指令时我好像出错了。');
        }
    }
}
//调用mcp服务查询天气
export function setupDailyWeatherJob(c: LagrangeContext<Message>, GroupId: number) {
    const cityToQuery = '北京';
    const cronTime = '0 27 15 * * *'; // CRON 表达式: 每天早上 8:00:00

    // 设置一个循环的定时器
    cron.schedule(cronTime, async () => {
        const currentDate = new Date().toLocaleDateString('zh-CN');

        try {
            // 调用 mcp 中的 getWeather 函数
            const weatherReport = await getWeather(cityToQuery);
            
            // 示例：在这里，你应该调用发送QQ消息的函数
            await c.sendGroupMsg(GroupId,weatherReport)

        } catch (error) {
            console.error(`[定时任务] 每日天气任务执行失败:`, error);
        }
    }, {
        timezone: "Asia/Shanghai"
    });
}