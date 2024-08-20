import express from "express";
import OpenAPIBackend from "openapi-backend";
import { devicereport, initdevices } from "./api/device";
import initcontroller from "./api/controller";
import Organization from "./model/organization";
import { randomUUID, UUID } from "crypto";
import { changemode, createorganization, createOrganizationToken, getlastvalues, isorganizationidfree, organizationinfo, updateorganization } from "./api/organization";
import cors from 'cors';
import SHOMEError from "./model/error";
import { Telegram, Telegraf, TelegramError, Context } from "telegraf";
import checkSettings from "./model/settings"
import colours from "./model/colours";
import { tgConfig } from "./model/telegram";
var npm_package_version = require('../package.json').version;
checkSettings();
const api = new OpenAPIBackend({ 
    definition: 'shome.yml'
});

api.init();

api.register({
    version:  async (c, req, res, org, roles) => {return res.status(200).json({version: npm_package_version})},
    tgconfig:  async (c, req, res, org, roles) => {return res.status(200).json(await tgConfig(app, tgBot))},
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
app.use(cors());

const PORT = process.env.PORT || 8000;

const tgBot = new Telegraf(process.env.tgbottoken || "");

//tgConfig(app, tgBot);

app.use(async (req, res) => {
    const requestUUID = randomUUID();
    const requestStart = new Date();
    req.headers["plutchart-uuid"] = requestUUID;
    req.headers["plutchart-start"] = requestStart.toISOString();
    console.log(`🚀 ${requestStart.toISOString()} - [${requestUUID}] - ${req.method} ${colours.fg.yellow}${req.path}\n${colours.fg.blue}headers: ${Object.keys(req.headersDistinct).filter(v => v.startsWith("shome-")).map(v => `${v} = '${req.headersDistinct[v]}'`).join(", ")}\nbody: ${Object.keys(req.body).map(v => `${v} = '${req.body[v]}'`).join(", ")}\nquery: ${Object.keys(req.query).map(v => `${v} = '${req.query[v]}'`).join(", ")}${colours.reset}`);

    let org = undefined;
    const organizationid = req.headers['shome-organizationid'] as string;
    const authtoken = req.headers['shome-authtoken'] as UUID;
    let ret;
    if (organizationid !== undefined) {
        try {
            org = await Organization.getByToken(organizationid, authtoken);
            console.log(`✅ Login successed`);
        } catch (e) {
            console.log(`🚫 Login failed`);
            //return res.status(401).json({err: "login failed"})
            org = undefined;
        }
    }
    try {
        ret =  await api.handleRequest({
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
                case "forbidden:roleexpected": ret = res.status(403).json((e as SHOMEError).json);
                default: ret = res.status(400).json((e as SHOMEError).json);
            }
        } else {
            ret =  res.status(500).json({code: "Wrong parameters", description: `Request ${req.url} - ${(e as Error).message}`});
            console.log(`🚫 Request ${req.url} - ${(e as Error).message}`);
        }
    }
    const requestEnd = new Date();
    req.headers["perfomance-request-end"] = requestEnd.toISOString();
    console.log(`${res.statusCode >= 200 && res.statusCode < 400 ? colours.fg.green : colours.fg.red}🏁 ${requestStart.toISOString()} - [${requestUUID}] - ${req.method} ${req.path} - ${res.statusCode} - ${requestEnd.getTime() - requestStart.getTime()} ms${colours.reset}`);
    return ret;
});

app.listen(PORT, ()=>console.log(`✅ Now listening on port ${PORT}`));
