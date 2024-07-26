import express, { type Express } from 'express'
import cors from 'cors'
import type { Logger } from 'pino'
import type Config from '../../config.js'
import { join } from 'node:path'
import { __dirname } from '../../utils.js'

class FileServerService {
    private readonly logger: Logger
    private readonly config: Config
    private readonly app: Express

    constructor(logger: Logger, config: Config) {
        this.logger = logger
        this.config = config
        this.app = express()
    }

    private setupRoutes(): void {
        this.app.use(
            cors({
                origin: '*'
            })
        )
        this.app.use(
            '/playlist.m3u',
            express.static(join(__dirname, '../files/playlist.m3u'))
        )
        this.app.use(
            '/epg.xml.gz',
            express.static(join(__dirname, '../files/epg.xml.gz'))
        )
    }

    run(): void {
        this.setupRoutes()
        this.app.listen(this.config.services.fileServer.port, () => {
            this.logger.info(
                `[File Server] running on port ${this.config.services.fileServer.port}.`
            )
        })
    }
}

export default FileServerService
