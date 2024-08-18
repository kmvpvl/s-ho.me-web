import { Request, Response } from 'express';
import {Context} from "openapi-backend";
import { v4 } from 'uuid';
import Organization, { SHOMERoles } from '../model/organization';
import { Types } from 'mongoose';
import SHOMEError from '../model/error';
import { Device, DeviceReport, IDevice, IDeviceReport } from '../model/device';
import { time } from 'console';
import { Telegraf } from 'telegraf';

export async function devicereport(context: Context, req:Request, res: Response, org: Organization, roles: SHOMERoles[], bot?: Telegraf) {
    console.log(`Device report data = '${JSON.stringify(context.request.body)}'`);
    if (!Organization.hasRole('controller', roles)) throw new SHOMEError("forbidden:roleexpected", `Role 'controller' was expected`);
    const ddr = req.body;
    const timestamp: Date = new Date(ddr.timestamp);
    const devices_ret: Array<IDevice> = [];
    for (const i in ddr.devices) {
        const idr: IDeviceReport = ddr.devices[i];
        idr.organizationid = org.json?.id as string;
        idr.ip = req.ip;
        if (idr.timestamp === undefined) idr.timestamp = timestamp;
        idr.created = new Date();
        const dr = new DeviceReport(undefined, idr);
        await dr.save();
        const device = await Device.getByName(idr.organizationid, idr.id);
        if ( device ) devices_ret.push(device.json as IDevice);
    }
    org.checkRules(bot);
    return res.status(200).json(devices_ret);
} 

export async function initdevices(context: Context, req:Request, res: Response, org: Organization, roles: SHOMERoles[]) {
    console.log(`Init devices data = '${JSON.stringify(context.request.body)}'`);
    if (!Organization.hasRole('controller', roles)) throw new SHOMEError("forbidden:roleexpected", `Role 'controller' was expected`);
  
    const idd: Array<IDevice> = req.body;
    const idd_ret: Array<IDevice> = [];
    for (const i in idd) {
        const id = idd[i];
        id.organizationid = org.json?.id as string;
        const d = await Device.createDevice(id);
        idd_ret.push(d.json as IDevice);
    }
    return res.status(200).json(idd_ret);
} 

