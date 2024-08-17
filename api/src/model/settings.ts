import { configDotenv } from 'dotenv';
import SHOMEError from './error';
export default function checkSettings() {
    configDotenv();

    if (!process.env.mongouri) {
        throw new SHOMEError("settings:mongouriundefined")
    }
    
    console.log(`mongouri = '${process.env.mongouri}'`);
    console.log(`tgbottoken = '${process.env.tgbottoken}'`);
}
