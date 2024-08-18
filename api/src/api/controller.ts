import { Request, Response } from 'express';
import {Context} from "openapi-backend";
import Organization, { SHOMERoles } from '../model/organization';
import Controller, { IController } from '../model/controller';
import SHOMEError from '../model/error';

export default async function initcontroller(context: Context, req:Request, res: Response, org: Organization, roles: SHOMERoles[]) {
    console.log(`Trying to init controoller: body='${JSON.stringify(req.body)}'`);
    if (!Organization.hasRole('controller', roles)) throw new SHOMEError("forbidden:roleexpected", `Role 'controller' was expected`);
  
    const ic: IController = req.body;
    ic.organizationid = org.json?.id as string;
    const c = await Controller.createController(ic);
    return res.status(200).json(c.json);
} 