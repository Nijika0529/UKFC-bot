import {mapper, LagrangeContext, PrivateMessage, GroupMessage, plugins, AddFriendOrGroupMessage, ApproveMessage} from 'lagrange.onebot';
import { logger } from './utils';
import { parseMessageRecord, saveRecordToFile, handleBotMention,handlePossibleCommand } from './impl';
import * as dotenv from 'dotenv';


dotenv.config();
const testGroupId = Number(process.env.test_GROUP_ID);

export class Impl {

     @mapper.onGroup(testGroupId)
        async recordGroupMessage_executeCommand(c: LagrangeContext<GroupMessage>) {
            const plainText = c.message.raw_message || '';

            try {
                const result = await c.getMsg(c.message.message_id);
            if (result && !(result instanceof Error) && result.data) {
                const record = await parseMessageRecord(c, result.data);
                if (record && record.content.trim() !== '') {
                    await saveRecordToFile(record, c.message.group_id);
                    await handlePossibleCommand(c);
                }
            }
        } catch (error) {
            logger.error(`[群: ${c.message.group_id}] 记录消息时发生错误:`, error);
        }
    
            // const newPdfFilename = "群聊总结.2025.08.19.pdf"
            // // const newPdfPath = path.join('/MCP/qq-group-summary/',newPdfFilename);
            // const newPdfPath = "/MCP/qq-group-summary/群聊总结.2025.08.19.pdf";
            // console.log(newPdfPath);
            // const uploadResult = await c.uploadGroupFile(testGroupId, newPdfPath, newPdfFilename);
            // // c.sendGroupMsg(testGroupId,"1");
            // console.log(uploadResult);
        
    }

    // @mapper.onGroup(testGroupId) // 将这里的群号替换为你自己的测试群号
    //     async handleGetMessage(c: LagrangeContext<GroupMessage>) {
    //         // 检查 c.message 是否存在，并获取 message_id
    //         if (!c.message) {
    //             logger.warning('收到了一个没有消息内容的事件！');
    //             return;
    //         }

    //         const messageId = c.message.message_id;
    //         logger.info(`收到一条消息，ID为: ${messageId}，正在尝试再次获取...`);

    //         // 使用 await 来调用 c.getMsg 方法，并等待其返回
    //         const response = await c.getMsg(messageId);

    //         // ==========================================================
    //         // **这里是关键的逻辑！**
    //         // 检查 API 调用是否成功，我们通过检查 retcode 是否存在且为 0 来判断
    //         // 这样做既能处理成功响应，也能处理 API 返回的 Error 对象。
    //         // ==========================================================
    //         if (response && 'retcode' in response && response.retcode === 0) {
    //             // API 调用成功，response.data 中包含了消息详情
    //             logger.info(`成功获取消息详情:`);
    //             logger.info(JSON.stringify(response.data, null, 2));

    //             // ==========================================================
    //             // **新增的逻辑！**
    //             // 直接从 response.data 中访问 raw_message 字段
               
                
    //         } else {
    //             // API 调用失败，打印错误信息
    //             logger.error('获取消息详情失败!');
    //             // 打印整个响应对象，以便我们能看到失败的原因
    //             logger.error(JSON.stringify(response, null, 2));
    //         }
    //     }
    //测试记录消息以及@功能
    // @mapper.onGroup(testGroupId) // 将这里的群号替换为你自己的测试群号
    //     async recordGroupMessage(c: LagrangeContext<GroupMessage>) {
    //         if (!c.message) {
    //             logger.warning('收到了一个没有消息内容的事件！');
    //             return;
    //         }

    //         // 从原始消息中直接获取消息ID
    //         const messageId = c.message.message_id;
            
    //         // 检查并获取 getMsg 的返回数据
    //         const result = await c.getMsg(messageId);
    //         if (!result || result instanceof Error || !result.data) {
    //             logger.error('获取消息详情失败!', result);
    //             return;
    //         }
    //         const data = result.data;

    //         // 检查是否为图片消息，如果是则不记录
    //         if (Array.isArray(data.message)) {
    //             const hasImage = data.message.some(msgPart => msgPart.type === "image");
    //             if (hasImage) {
    //                 console.log("检测到图片消息，不进行记录。");
    //                 c.finishSession();
    //                 return;
    //             }
    //         }
            
    //         // 初始化消息记录对象，确保所有字段都存在
    //         const correctedTimestamp = data.time + 8 * 60 * 60
    //         const record: {
    //             sender: string;
    //             user_id: number;
    //             time: string;
    //             content: string;
    //             replyName: string | null;
    //             replyText: string | null;
    //         } = {
    //             sender: data.sender.nickname,
    //             user_id: data.sender.user_id,
    //             // 将时间戳转换为中国时区（东八区）的 HH:MM 格式
    //             time: new Intl.DateTimeFormat('zh-CN', { 
    //                 hour: '2-digit', 
    //                 minute: '2-digit', 
    //                 hour12: false, 
    //                 timeZone: 'Asia/Shanghai' 
    //             }).format(new Date(correctedTimestamp * 1000)),
    //             content: "",
    //             replyName: null,
    //             replyText: null
    //         };

    //         // 用于提取回复的ID和文本
    //         let replyId: string | null = null;
    //         let textParts: string[] = [];

    //         // ==========================================================
    //         // **核心逻辑：手动遍历消息段，精确提取所需信息**
    //         // ==========================================================
    //         if (Array.isArray(data.message)) {
    //             for (const msgPart of data.message) {
    //                 if (msgPart.type === "reply" && msgPart.data?.id) {
    //                     // 提取回复ID
    //                     replyId = msgPart.data.id;
    //                 } else if (msgPart.type === "text" && msgPart.data?.text) {
    //                     // 提取文本内容
    //                     textParts.push(msgPart.data.text.trim());
    //                 }
    //             }
    //         }
            
    //         // 将所有文本段拼接成 content
    //         record.content = textParts.join(" ");

    //         // 如果是回复，获取被回复的消息详情
    //         if (replyId) {
    //             const replyResponse = await c.getMsg(Number(replyId));
    //             if (replyResponse && 'retcode' in replyResponse && replyResponse.retcode === 0 && replyResponse.data) {
    //                 const replyData = replyResponse.data;
    //                 record.replyName = `@${replyData.sender.nickname}`;
                    
    //                 // 提取被回复消息的纯文本
    //                 if (Array.isArray(replyData.message)) {
    //                     record.replyText = replyData.message
    //                         .filter((m: any) => m.type === "text")
    //                         .map((m: any) => m.data.text.trim())
    //                         .join(" ");
    //                 } else if (typeof replyData.message === "string") {
    //                     record.replyText = replyData.message.trim();
    //                 }
    //             }
    //         }

    //         // 示例：将日志保存到本地文件
    //         const getTodayFilePath = () => {
    //             const today = new Date();
    //             const year = today.getFullYear();
    //             const month = (today.getMonth() + 1).toString().padStart(2, '0');
    //             const day = today.getDate().toString().padStart(2, '0');
    //             return path.join(__dirname, '..', 'logs', `test-${year}-${month}-${day}.json`);
    //         };

    //         const logFile = getTodayFilePath();
    //         let logs: any[] = [];
    //         if (fs.existsSync(logFile)) {
    //             logs = JSON.parse(fs.readFileSync(logFile, "utf-8"));
    //         }

    //         logs.push(record);
    //         fs.mkdirSync(path.dirname(logFile), { recursive: true });
    //         fs.writeFileSync(logFile, JSON.stringify(logs, null, 2), "utf-8");
            
    //         console.log(`已记录到 ${logFile}:`, record);
            
    //         const botQQ = 3880559396;
    //         if (Array.isArray(data.message) && data.message.some((m: any) => m.type === "at" && m.data?.qq == botQQ)) {
    //             await c.sendGroupMsg(c.message.group_id, "凉薄还没开发好他的bot，目前没有功能");
    //         }
    //         c.finishSession();
    //     }


    //测试欢迎新人入群消息
    // @mapper.onGroupIncrease(testGroupId)
    // async handleGroupIncreaseTest(c: LagrangeContext<ApproveMessage>) {
    //     console.log(`user: ${c.message.user_id} join the group`);
    //     const newMemberId = c.message.user_id;
    //     const groupId = c.message.group_id;
        
    //     // 调用 API 来获取用户的详细信息
    //     const userInfo = await c.getStrangerInfo(newMemberId);
        
    //     // 安全地提取昵称
    //     let newMemberName = 'new'; // 默认值

    // // 'retcode' in userInfo 检查 userInfo 对象中是否存在 retcode 属性
    // // 这行代码将 userInfo 的类型从 'Error | CommonResponse' 收窄到 'CommonResponse'
    //     if (userInfo && 'retcode' in userInfo && userInfo.retcode === 0 && userInfo.data) {
    //         // 当且仅当 API 成功时，才能安全地访问 data.nickname
    //         newMemberName = userInfo.data.nickname;
    //     } else {
    //         // 如果 API 调用失败，我们可以在这里打印错误日志
    //         console.error(`Failed to get user info for ID: ${newMemberId}`, userInfo);
    //     }
    //     await c.sendGroupMsg(groupId, `Welcome ${newMemberName} to UKFC`);
        
    // }



}