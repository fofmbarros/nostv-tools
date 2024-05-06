import 'dotenv/config'
import { pino } from 'pino'
import configFile from '../config.json' assert { type: 'json' }
import Config from './config.js'
import { readFileSync } from 'fs'
import {
    SessionService,
    SetupService,
    FileServerService,
    XMLTVService,
    ProxyService
} from './services/index.js'
import User, { type UserClient, type UserDevice } from './user.js'
import { join } from 'node:path'
import { __dirname } from './utils.js'

const logger = pino({
    transport: {
        target: 'pino-pretty',
        options: {
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname'
        }
    }
})

const config = new Config(configFile.appVersion, configFile.mpdUserAgent, {
    fileServer: {
        ...configFile.services.fileServer,
        disabled:
            process.env.CONFIG_FILESERVER_DISABLED === 'true' ||
            configFile.services.fileServer.disabled
    },
    proxy: {
        ...configFile.services.proxy,
        disabled:
            process.env.CONFIG_PROXY_DISABLED === 'true' ||
            configFile.services.proxy.disabled,
        publicUrl:
            process.env.CONFIG_PROXY_PUBLIC_URL ??
            configFile.services.proxy.publicUrl
    },
    session: {
        disabled:
            process.env.CONFIG_SESSION_DISABLED === 'true' ||
            configFile.services.session.disabled,
        cronExpression:
            process.env.CONFIG_SESSION_CRON ??
            configFile.services.session.cronExpression
    },
    xmltv: {
        disabled:
            process.env.CONFIG_XMLTV_DISABLED === 'true' ||
            configFile.services.xmltv.disabled,
        cronExpression:
            process.env.CONFIG_XMLTV_CRON ??
            configFile.services.xmltv.cronExpression
    }
})

const run = async (): Promise<void> => {
    try {
        const userFile: {
            client: UserClient
            device: UserDevice
            userAgent: string
        } = JSON.parse(
            readFileSync(join(__dirname, '../files/user.json')).toString()
        )

        const user = new User(
            userFile.client,
            userFile.device,
            userFile.userAgent
        )

        const sessionService = new SessionService(logger, config, user)
        const setupService = new SetupService(
            logger,
            config,
            user,
            sessionService
        )
        const fileServerService = new FileServerService(logger, config)
        const xmltvService = new XMLTVService(
            logger,
            config,
            user,
            setupService,
            sessionService
        )
        const proxyService = new ProxyService(
            logger,
            config,
            user,
            sessionService
        )

        if (!config.services.session.disabled) await sessionService.setup()

        await setupService.run()

        if (!config.services.fileServer.disabled) fileServerService.run()

        if (!config.services.proxy.disabled) proxyService.run()

        if (!config.services.xmltv.disabled) {
            await xmltvService.run()
            xmltvService.runJob()
        }
    } catch (e) {
        logger.error(e)
    }
}

await run()
