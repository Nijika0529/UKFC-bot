import * as fs from 'fs/promises'; // 使用异步的 fs/promises
import * as iconv from 'iconv-lite';
import * as path from 'path';
import { execFile } from 'child_process';
import cron from 'node-cron';
import {mapper, LagrangeContext, PrivateMessage, GroupMessage, plugins, AddFriendOrGroupMessage, ApproveMessage, Message} from 'lagrange.onebot';
import { MessageRecord } from './types'; // 导入我们定义的类型
import { getGroupSummaryPDF, getWeather,checkGroupjoinrequest } from './mcp';
import {splitMessage} from './utils'
import * as dotenv from 'dotenv';


dotenv.config();
const new_GROUP_ID = Number(process.env.new_GROUP_ID);

const BOT_QQ = Number(process.env.Docker_TEST);

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

    const correctedTimestamp = messageData.time;
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
export async function handleBotMention(c: LagrangeContext<GroupMessage>,messageData: any): Promise<boolean> {
    const isAtBot = Array.isArray(messageData.message) &&
                    messageData.message.some(
                        (m: any) => m.type === "at" && m.data?.qq === BOT_QQ
                    );
    return isAtBot;
}

const ALLOWED_COMMANDS = new Set(['ls', 'cat', 'ping', 'whoami', 'date', 'where', 'which','ifconfig','id','ip']);

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
    const cityToQuery = '101100401';
    const cronTime = '0 00 8 * * *'; // CRON 表达式: 每天早上 8:00:00

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

export function setsummaryPDFJob(c: LagrangeContext<Message>, GroupId: number) {
    const cronTime = '0 05 23 * * *';

    cron.schedule(cronTime, async () => {

        const today = new Date();
        const year = today.getFullYear();
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const day = today.getDate().toString().padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;

        //使用 path.join 动态生成当天的 JSON 文件路径
        const filepath = path.join(process.cwd(), 'logs', String(GroupId), `${dateString}.json`);
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
        
        try {
            await getGroupSummaryPDF(filepath);
            const oldPdfPath = '/app/qq-group-summary/群聊总结.pdf';
            const newPdfFilename = `群聊总结.${year}.${month}.${day}.pdf`;
            const newPdfPath = path.join('/app/qq-group-summary/', newPdfFilename);
            await fs.rename(oldPdfPath, newPdfPath);
            // console.log("10000");
            await delay(500);
            const uploadResult = await c.uploadGroupFile(GroupId, newPdfPath, newPdfFilename);
            console.log(uploadResult);

        } catch (error) {
            console.error(`[定时任务] 群聊日报总结任务执行失败:`, error);
            await c.sendGroupMsg(GroupId, "抱歉，今天的群聊总结生成失败了 T_T");
        }
    }, {
        timezone: "Asia/Shanghai"
    });
}

//处理入群申请

export class GroupJoinHandler{

    @mapper.onAddFriendOrGroup()
    async handleAddRequest(event: any) {
        console.log("收到加群/加好友申请:", event.message);
        const msg = event.message;
        // 判断是不是群申请
        if (msg.request_type === "group") {
            // 取出必要字段
            const flag = msg.flag;
            const sub_type = msg.sub_type; // "add" 或 "invite"
            const groupId = msg.group_id;
            const userId = msg.user_id;
            const comment = msg.comment ? msg.comment : null;

            console.log("flag:", flag);
            console.log("sub_type:", sub_type);
            console.log("groupId:", groupId);
            console.log("userId:", userId);

            // 业务逻辑，比如根据群号判断是否同意
            if (groupId === new_GROUP_ID || 1054047948) {
                // ✅ 调用接口同意入群
                // const result = await checkGroupjoinrequest(comment);
                const result = validateMessage(comment);
                if (result === true){
                    await event.setGroupAddRequest(flag, sub_type, true);
                    console.log(`已处理${userId}进群申请`);
                }
                else{
                    console.log(`请手动处理${userId}进群申请`);
                }
                
            } else {
                // ❌ 拒绝
                // await event.setGroupAddRequest(flag, sub_type, false, "不允许加入");
                console.log("已拒绝进群申请");
            }
        }
    }
}
const subjects = ["软件", "软件工程", "软工", "网安", "网络空间", "网络空间安全", "计科", "计算机", "计算机科学与技术", "大数据", "物联网"];

function validateMessage(message: string): boolean {
    const parts = splitMessage(message);
    console.log(parts);

    if (parts.length !== 3) return false ;

    const [subject, className, name] = parts;

    // 检查学科
    if (!subjects.includes(subject)) return false;

    // 检查班级（假设班级为数字或字母+数字组合）
    if (!validateClass(className)) return false;

    // 检查姓名（汉字）
    if (!/^[\p{Script=Han}]+$/u.test(name)) return false;

    return true;
}
function validateClass(className: string): boolean {
    // 先匹配全数字
    if (!/^\d+$/.test(className)) return false;

    const num = parseInt(className, 10);

    // 检查是否在允许的区间
    const ranges = [
        [2301, 2380],
        [2401, 2480],
        [2501, 2580]
    ];

    return ranges.some(([min, max]) => num >= min && num <= max);
}