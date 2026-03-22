import { Telegraf, Context as TGContext } from "telegraf";
import Organization from "../model/organization";
import { Express } from 'express';
import { relativeDateString } from "./commons";

async function changemode_command(ctx: TGContext, bot: Telegraf, mode: string) {
    const chat_id = ctx.message?.chat.id
    if (undefined !== chat_id) {
        try {
            const org_roles = await Organization.getByTgUserId(chat_id);
            if (Organization.hasRole("user", org_roles.roles)) {
                try {
                    await org_roles.organization.changemode(mode);
                    bot.telegram.sendMessage(chat_id, `Mode '${mode}' has set for ${org_roles.organization.name}`, {disable_notification: true})
                } catch(e) {
                    bot.telegram.sendMessage(chat_id, `Mode '${mode}' hasn't set for ${org_roles.organization.name}. Check and create mode GRD for this site`, {disable_notification: true})
                }
            } else {
                bot.telegram.sendMessage(chat_id, "Access denied", {disable_notification: true})
            }
        } catch (e) {
            bot.telegram.sendMessage(chat_id, "No orgs found", {disable_notification: true})
        }
    }
}

async function values_command(ctx: TGContext, bot: Telegraf){
    const chat_id = ctx.message?.chat.id
    if (undefined !== chat_id) {
        try {
            const org_roles = await Organization.getByTgUserId(chat_id);
            if (Organization.hasRole(["viewer", "user"], org_roles.roles)) {
                try {
                    const orgMnemonicName = org_roles.organization.name;
                    const cur_mode = await org_roles.organization.getMode();
                    const last_values = await org_roles.organization.devicesWithLastValues();
                    const str = last_values.map(d=>`${d.name} - ${d.value}${d.units?d.units:""} - ${relativeDateString(new Date(d.timestamp))}`).join('\n');
                    bot.telegram.sendMessage(chat_id, `${cur_mode?`Current mode of ${orgMnemonicName}: ${cur_mode}`:`No mode of ${orgMnemonicName}`}\nLast values:\n${str}`)
                } catch(e) {
                    bot.telegram.sendMessage(chat_id, ``)
                }
            } else {
                bot.telegram.sendMessage(chat_id, "Access denied")
            }
        } catch (e) {
            bot.telegram.sendMessage(chat_id, "No orgs found")
        }
    }
}

async function help_command(ctx: TGContext, bot: Telegraf){
    
}
export async function tgConfig(expressApp: Express, tgBot: Telegraf) {
    const ret: any = {};
    try {
        if (process.env.tgwebhookurl) {
            expressApp.use(
            await tgBot.createWebhook({
                domain: process.env.tgwebhookurl, 
                path:`/telegram`
            }));
            ret.webhookSet = true;
            ret.webhookAddress.domain = process.env.tgwebhookurl;
        }
        tgBot.telegram.setMyCommands(
            [{command: "values", description: "Reveals last values of all sensors"},
            {command: "off", description: "Go to OFF mode"},
            {command: "grd", description: "Go to GRD mode"},
            {command: "help", description: "Help"},
            ]);
        ret.myCommandsSet = true; 
        tgBot.command("grd", async (ctx)=>await changemode_command(ctx, tgBot, "GRD"));
        tgBot.command("off", async (ctx)=>await changemode_command(ctx, tgBot, "OFF"));
        tgBot.command("help", async (ctx)=>await help_command(ctx, tgBot));
        tgBot.command("values", async (ctx)=>await values_command(ctx, tgBot));
        ret.callbackFunctionsSet = true;
        tgBot.launch();
        ret.botLaunched = true;
        if (tgBot) console.log(`Bot started succeccfully`);
        else console.log(`Bot has not started`);
        process.once('SIGINT', () => tgBot.stop('SIGINT'));
        process.once('SIGTERM', () => tgBot.stop('SIGTERM'));
        ret.ok = true;
    } catch(e) {
        ret.ok = false;
        ret.error = e;
    }
    return ret;
}
