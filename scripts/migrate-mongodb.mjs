import {getStorage} from '../server/storage.mjs';
import {migrateLegacy} from '../server/migrate.mjs';
const storage=await getStorage();
try{console.log('MongoDB 迁移完成（保留原文件）：',await migrateLegacy(storage));}finally{await storage.close();}
