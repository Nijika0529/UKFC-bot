import * as path from 'path';
import * as fs from 'fs/promises'; 

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