import { configDotenv } from 'dotenv';
import SHOMEError from './error';
export default function checkSettings() {
    configDotenv();

    const hasUri = Boolean(process.env.mysqluri);
    const hasParts = Boolean(process.env.mysqlhost && process.env.mysqluser && process.env.mysqldatabase);

    if (!hasUri && !hasParts) {
        throw new SHOMEError("settings:mysqlundefined", "Set mysqluri or mysqlhost/mysqluser/mysqldatabase")
    }

    console.log(`mysqluri = '${process.env.mysqluri || "<not set>"}'`);
    console.log(`mysqlhost = '${process.env.mysqlhost || "<not set>"}'`);
    console.log(`mysqldatabase = '${process.env.mysqldatabase || "<not set>"}'`);
    console.log(`tgbottoken = '${process.env.tgbottoken}'`);
}
