import { UUID } from "crypto";
import { Types } from "mongoose";
import { v4 } from "uuid";
import Organization, { IOrganization } from "../model/organization";
import { Md5 } from "ts-md5";
import { SHOMERoles } from "../model/organization";
import { Request, Response } from 'express';
import { Context} from "openapi-backend";
import SHOMEError from "../model/error";
import { Telegraf } from "telegraf";


export async function createOrganizationToken(cntx: Context, req: Request, res: Response, org: Organization, roles: SHOMERoles[]){
    const r = cntx.request.body.roles;
    console.log(`roles='${r}'`);
    if (Organization.hasRole('admin', roles)) {
        const ret = await org.createToken(r);
        return res.status(200).json(ret);
    } else {
        throw new SHOMEError("forbidden:roleexpected", `Admin role expected`);
    }
}

export async function organizationinfo(cntx: Context, req: Request, res: Response, org: Organization, roles: SHOMERoles[]){
    console.log(`roles='${roles}'`);

    return res.status(200).json({
        org: org.json,
        devices: await org.devices()
    });
}

export async function updateorganization(cntx: Context, req: Request, res: Response, org: Organization, roles: SHOMERoles[]){
    console.log(`roles='${roles}'`);
    const modes = cntx.request.body.modes;
    const rules = cntx.request.body.rules;
    const id = cntx.request.body.id;
    if (Organization.hasRole('admin', roles)) {
        await org.update(id, modes, rules);
        return res.status(200).json(org.json);
    } else {
        throw new SHOMEError("forbidden:roleexpected", `Admin role expected`);
    }
}

export async function getlastvalues(cntx: Context, req: Request, res: Response, org: Organization, roles: SHOMERoles[]){
    console.log(`roles='${roles}'`);
    const arr = req.body;

    return res.status(200).json(await org.devicesWithLastValues(arr));
}

export async function changemode(cntx: Context, req: Request, res: Response, org: Organization, roles: SHOMERoles[], bot: Telegraf){
    console.log(`roles='${roles}'`);
    console.log(`mode='${req.body.mode}'`);
    if (Organization.hasRole('user', roles)) {
        try {
            await org.changemode(req.body.mode);
            org.checkRules(bot);
            return res.status(200).json();
        } catch (e){
            return res.status(400).json((e as SHOMEError).json);
        }
    } else {
        throw new SHOMEError("forbidden:roleexpected", `Admin role expected`);
    }
}