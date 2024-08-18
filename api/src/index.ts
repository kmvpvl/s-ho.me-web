import express from "express";
import OpenAPIBackend from "openapi-backend";
import { devicereport, initdevices } from "./api/device";
import initcontroller from "./api/controller";
import Organization from "./model/organization";
import { UUID } from "crypto";
import { changemode, createorganization, createOrganizationToken, getlastvalues, isorganizationidfree, organizationinfo, updateorganization } from "./api/organization";
import cors from 'cors';
import morgan from "morgan";
import SHOMEError from "./model/error";
import { Telegram, Telegraf, TelegramError, Context } from "telegraf";
import checkSettings from "./model/settings"
var npm_package_version = require('../package.json').version;
checkSettings();
const api = new OpenAPIBackend({ 
    definition: 'shome.yml'
});

api.init();

api.register({
    version:  async (c, req, res, org, roles) => {return res.status(200).json({version: npm_package_version})},
    isorganizationidfree: async (c, req, res, org, roles, bot) => await isorganizationidfree(c, req, res, org, roles, bot),
    createorganization: async (c, req, res, org, roles, bot) => await createorganization(c, req, res, org, roles, bot),
    devicereport: async (c, req, res, org, roles, bot) => await devicereport(c, req, res, org, roles, bot),
    initcontroller: async (c, req, res, org, roles) => await initcontroller(c, req, res, org, roles),
    initdevices: async (c, req, res, org, roles) => await initdevices(c, req, res, org, roles),
    createorganizationtoken: async (c, req, res, org, roles) => await createOrganizationToken(c, req, res, org, roles),
    updateorganization: async (c, req, res, org, roles) => await updateorganization(c, req, res, org, roles),
    changemode: async (c, req, res, org, roles, bot) => await changemode(c, req, res, org, roles, bot),
    organizationinfo: async (c, req, res, org, roles) => await organizationinfo(c, req, res, org, roles),
    getlastvalues: async (c, req, res, org, roles) => await getlastvalues(c, req, res, org, roles),
    //controllerreport: async (c, req, res, org, roles) => await controllerreport(c, req, res),
    validationFail: async (c, req, res, org, roles) => res.status(400).json({ err: c.validation.errors }),
    notFound: async (c, req, res, org, roles) => res.status(404).json({c}),
    notImplemented: async (c, req, res, org, roles) => res.status(500).json({ err: 'not implemented' }),
    unauthorizedHandler: async (c, req, res, org, roles) => res.status(401).json({ err: 'not auth' })
});
api.registerSecurityHandler('SHOMEAuthOrganizationId', async (context, req, res, org)=> {
    return org !== undefined;
});

api.registerSecurityHandler('SHOMEAuthToken',  (context, req, res, org)=> {
    return true;
});

const app = express();
app.use(express.json());
app.use(morgan('tiny'));
app.use(cors());

const PORT = process.env.PORT || 8000;

let tgBot: Telegraf;

if (process.env.tgbottoken) {
    tgBot = new Telegraf<Context>(process.env.tgbottoken);
    if (tgBot) console.log(`Bot started succeccfully`);
    else console.log(`Bot has not started`);
}

app.use(async (req, res) => {
    let org;
    const organizationid = req.headers['shome-organizationid'] as string;
    const authtoken = req.headers['shome-authtoken'] as UUID;
    console.log(`-----\n✅ [${req.method}:${req.originalUrl}] headers organizationid='${organizationid}'; authtoken='${authtoken}'`);
    try {
        org = await Organization.getByToken(organizationid, authtoken);
        console.log(`✅ Login successed`);
    } catch (e) {
        console.log(`🚫 Login failed`);
        //return res.status(401).json({err: "login failed"})
        org = undefined;
    }
    try {
        return await api.handleRequest({
            method: req.method,
            path: req.path,
            body: req.body,
            headers: {
                'shome-organizationid': organizationid,
                'shome-authtoken': authtoken
            }
        }, req, res, org?.organization, org?.roles, tgBot);
    } 
    catch (e) {
        if (e instanceof SHOMEError) {
            switch ((e as SHOMEError).json.code) {
                case "forbidden:roleexpected": return res.status(403).json((e as SHOMEError).json);
                default: return res.status(400).json((e as SHOMEError).json);
            }
        } else {
            return res.status(500).json({code: "Wrong parameters", description: `Request ${req.url} - ${(e as Error).message}`});
            console.log(`🚫 Request ${req.url} - ${(e as Error).message}`);
        }
    }
});
app.listen(PORT, ()=>console.log(`✅ Now listening on port ${PORT}`));
