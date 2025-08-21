import { server } from 'lagrange.onebot';
import './test';
import './product'
import { setupDailyWeatherJob, setsummaryPDFJob } from './impl';
import * as dotenv from 'dotenv';
import './ukfc'

dotenv.config();
const My_ID = Number(process.env.My_ID);
const test_GROUP_ID = Number(process.env.test_GROUP_ID);
const Docker_TEST = Number(process.env.Docker_TEST);
const fox_home_GROUP_ID = Number(process.env.fox_home_GROUP_ID);
const main_GROUP_ID = Number(process.env.main_GROUP_ID);


// server 刚启动的时候要做的事情
server.onMounted(c => {
    // 向 QQ 号为 123456 的好友发送文本信息 "成功上线"
    c.sendPrivateMsg(My_ID, '成功上线');
    setupDailyWeatherJob(c,test_GROUP_ID);
    setsummaryPDFJob(c,fox_home_GROUP_ID);
    setupDailyWeatherJob(c,main_GROUP_ID);
});

// server 即将关闭时要做的事情
server.onUnmounted(c => {
    // 向 QQ 号为 123456 的好友发送文本信息 "成功下线"
    // c.sendPrivateMsg(, '成功下线');
})

server.run({
    type: 'backward-websocket',
    host: '127.0.0.1',
    port: 8080,
    path: '/onebot/v11/ws',
    qq: Docker_TEST
});
