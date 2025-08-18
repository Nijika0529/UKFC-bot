import { server } from 'lagrange.onebot';
import './impl';
import './test';
import './product'


// server 刚启动的时候要做的事情
server.onMounted(c => {
    // 向 QQ 号为 1193466151 的好友发送文本信息 "成功上线"
    c.sendPrivateMsg(3140516102, '成功上线');
});

// server 即将关闭时要做的事情
server.onUnmounted(c => {
    // 向 QQ 号为 1193466151 的好友发送文本信息 "成功下线"
    // c.sendPrivateMsg(3140516102, '成功下线');
})

server.run({
    type: 'backward-websocket',
    host: '127.0.0.1',
    port: 8080,
    path: '/onebot/v11/ws',
    qq: 3880559396
});
