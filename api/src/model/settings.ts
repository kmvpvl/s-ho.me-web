import fs from 'fs';
import SHOMEError from './error';

const removeJSONComments = (json: string) => {
    return json.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => g ? "" : m);
}

try {
    let strSettings = fs.readFileSync("settings.json", "utf-8");
    const settings = JSON.parse(removeJSONComments(strSettings));

    for (let v in settings) {
        process.env[v] = settings[v];
    }
} catch (err: any) {
    // if settings.json not found, trying to use process.ENV variables
    if (!process.env.mongouri) {
        throw new SHOMEError("settings:mongouriundefined")
    }
}

export default process.env;