import * as path from 'path';
import * as fs from 'fs/promises'; 

export const logger = {
    info: console.log,
    warning: console.warn,
    error: console.error
};

export async function readJsonAsStringAsync(filePath: string): Promise<string | null> {
    try {
        const absolutePath = path.resolve(filePath);
        const fileContent: string = await fs.readFile(absolutePath, 'utf-8');
        
        return fileContent;
    } catch (error: any) {
        console.error(`异步读取文件失败: ${filePath}`, error.message);
        return null;
    }
}


/**
 * @description 清理消息，去掉空格、标点、特殊符号，然后拆分汉字和数字
 * @param message 原始消息
 * @returns 拆分后的数组，连续汉字或连续数字为一个元素
 */
export function splitMessage(message: string): string[] | null {
  if (!message) return null;

  // 1. 先尝试提取 "答案: ..." 部分（支持中文/英文冒号）
  const ansMatch = message.match(/(?:答案|answer)\s*[:：]\s*([\s\S]*)/i);
  let content = ansMatch ? ansMatch[1] : message;

  // 如果没有显式 "答案"，尝试取最后一个冒号之后的内容
  if (!ansMatch) {
    const idx1 = message.lastIndexOf(':');
    const idx2 = message.lastIndexOf('：');
    const i = Math.max(idx1, idx2);
    if (i >= 0) content = message.slice(i + 1);
  }

  // 2. 清理：去掉换行和空白
  content = content.trim().replace(/\s+/g, '');

  // 3. 去掉所有非：汉字、ASCII字母、数字 的字符（移除 / + - 等分隔符）
  // 需要 Node/TS 支持 Unicode 属性转义
  content = content.replace(/[^0-9\p{Script=Han}A-Za-z]/gu, '');

  // 4. 尝试严格匹配：<专业: 字母或汉字><班级: 数字><姓名: 字母或汉字>
  let m = content.match(/^([\p{Script=Han}A-Za-z]+?)(\d+)([\p{Script=Han}A-Za-z]+)$/u);
  if (m) {
    return [m[1], m[2], m[3]];
  }

  // 5. 兜底：提取所有“连续汉字/字母”或“连续数字”的块，再做合并尝试
  const parts = content.match(/[\p{Script=Han}A-Za-z]+|\d+/gu) || [];
  if (parts.length === 0) return null;
  if (parts.length === 3) return parts;

  // 如果多于3段，找到第一个全数字段，认为它是班级号，前面合并为专业，后面合并为姓名
  const numIndex = parts.findIndex(p => /^\d+$/.test(p));
  if (numIndex > 0 && numIndex < parts.length - 1) {
    const prof = parts.slice(0, numIndex).join('');
    const cls = parts[numIndex];
    const name = parts.slice(numIndex + 1).join('');
    return [prof, cls, name];
  }

  // 其它情况（比如只有两段），直接返回 parts（调用方可以再校验长度）
  return parts.length > 0 ? parts : null;
}

