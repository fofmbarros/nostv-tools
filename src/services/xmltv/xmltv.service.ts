import type { Logger } from 'pino'
import axios from 'axios'
import type { SessionService, SetupService } from '../index.js'
import { CronJob } from 'cron'
import { addDays, escapeXml, __dirname } from '../../utils.js'
import {
    type Xmltv,
    writeXmltv,
    type XmltvChannel,
    type XmltvProgramme
} from '@iptv/xmltv'
import type { ChannelProgrammeResponse } from './xmltv.dtos.js'
import { ChannelProgramme, type Channel } from './xmltv.entities.js'
import { writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import type Config from '../../config.js'
import type User from '../../user.js'
import { join } from 'node:path'

class XMLTVService {
    private readonly logger: Logger
    private readonly config: Config
    private readonly user: User

    private readonly setupService: SetupService
    private readonly sessionService: SessionService

    constructor(
        logger: Logger,
        config: Config,
        user: User,

        setupService: SetupService,
        sessionService: SessionService
    ) {
        this.logger = logger
        this.config = config
        this.user = user

        this.setupService = setupService
        this.sessionService = sessionService
    }

    private async fetchChannelEPG(
        channel: Channel,
        startDate: Date,
        endDate: Date
    ): Promise<Array<ChannelProgrammeResponse>> {
        const session = this.sessionService.authZSession

        if (session === null) throw new Error('No session found.')

        this.logger.info(`[XMLTV] Retrieving EPG for channel ${channel.name}.`)
        const { data } = await axios.get<Array<ChannelProgrammeResponse>>(
            this.config.endpoints.ott.epg,
            {
                params: {
                    channels: channel.serviceId,
                    minDate: startDate.toISOString(),
                    maxDate: endDate.toISOString(),
                    isDateInclusive: 'true',
                    access_token: session.AccessToken,
                    client_id: this.user.client.authZId
                },
                headers: {
                    'X-Core-ProfileId': this.user.client.profileId,
                    'X-Core-DeviceId': this.user.device.id,
                    'X-Core-DeviceType': this.user.device.type,
                    'X-Core-AppVersion': this.config.appVersion,
                    'X-Core-ContentRatingLimit': '0',
                    'X-Apikey': this.user.client.authZId,
                    Authorization: `Bearer ${session.AccessToken}`,
                    'User-Agent': this.user.userAgent
                }
            }
        )

        return data
    }

    private saveEPGToFile(xmltv: Xmltv, compressFile: boolean): void {
        const xml = writeXmltv(xmltv)
        writeFileSync(
            join(__dirname, '../files/epg.xml.gz'),
            compressFile ? gzipSync(xml) : xml
        )
    }

    private buildEPGData(channels: Array<Channel>, startDate: Date): Xmltv {
        const xmltvChannels: Array<XmltvChannel> = []
        const xmltvProgrammes: Array<XmltvProgramme> = []

        for (const [i, channel] of channels.entries()) {
            this.logger.info(
                `${channel.name} [${channel.serviceId}] [${i + 1}/${channels.length}]`
            )

            const channelIconSrc = new URL(this.config.endpoints.images)

            channelIconSrc.searchParams.append('sourceUri', channel.logo)
            channelIconSrc.searchParams.append('profile', 'ott_16_220x64')
            channelIconSrc.searchParams.append(
                'client_id',
                this.user.client.authZId
            )

            const xmltvChannel = {
                displayName: [{ _value: escapeXml(channel.name) }],
                icon: [
                    {
                        src: escapeXml(channelIconSrc.toString())
                    }
                ],
                id: channel.assetId
            }
            xmltvChannels.push(xmltvChannel)

            channel.programmes.forEach((programme) => {
                const programmeIconSrc = new URL(this.config.endpoints.images)

                programmeIconSrc.searchParams.append(
                    'sourceUri',
                    programme.image
                )
                programmeIconSrc.searchParams.append('profile', 'ott_1_452x340')
                programmeIconSrc.searchParams.append(
                    'client_id',
                    this.user.client.authZId
                )

                const xmltvProgramme: XmltvProgramme = {
                    channel: channel.assetId,
                    start: programme.startDate,
                    stop: programme.endDate,
                    category: [
                        {
                            lang: 'pt',
                            _value: escapeXml(programme.category)
                        }
                    ],
                    title: [
                        {
                            lang: 'pt',
                            _value: escapeXml(programme.title)
                        }
                    ],
                    ...(programme.subtitle !== null && {
                        subTitle: [
                            {
                                lang: 'pt',
                                _value: escapeXml(programme.subtitle)
                            }
                        ]
                    }),
                    rating: [
                        {
                            system: 'IGAC',
                            value: escapeXml(programme.igacRating)
                        }
                    ],
                    ...(programme.imdbRating !== null && {
                        starRating: [
                            {
                                system: 'IMDB',
                                value: `${programme.imdbRating} / 10`
                            }
                        ]
                    }),

                    ...(programme.description != null && {
                        desc: [
                            {
                                lang: 'pt',
                                _value: escapeXml(programme.description)
                            }
                        ]
                    }),
                    ...(programme.season > 0 &&
                        programme.episode > 0 && {
                            episodeNum: [
                                {
                                    _value: `S${
                                        programme.season < 10
                                            ? `0${programme.season}`
                                            : programme.season
                                    }E${
                                        programme.episode < 10
                                            ? `0${programme.episode}`
                                            : programme.episode
                                    }`,
                                    system: 'onscreen'
                                }
                            ]
                        }),
                    new: programme.title.includes('Direto'),
                    icon: [
                        {
                            src: escapeXml(programmeIconSrc.toString()),
                            width: 452,
                            height: 340
                        }
                    ]
                }

                xmltvProgrammes.push(xmltvProgramme)
            })
        }

        const xmltvObject: Xmltv = {
            channels: xmltvChannels,
            programmes: xmltvProgrammes,
            date: startDate,
            sourceInfoName: 'NOSTV',
            sourceDataUrl: 'https://nostv.pt/'
        }

        return xmltvObject
    }

    async run(): Promise<void> {
        const channels = this.setupService.channels

        const startDate = new Date()
        const endDate = addDays(startDate, 7)

        const channelsWithProgrammes: Array<Channel> = []

        for await (const channel of channels) {
            try {
                const channelEPGResponse = await this.fetchChannelEPG(
                    channel,
                    startDate,
                    endDate
                )
                const channelProgrammes = channelEPGResponse.reduce<
                    Array<ChannelProgramme>
                >((result, channelProgrammeResponse) => {
                    result.push(
                        ChannelProgramme.fromResponse(channelProgrammeResponse)
                    )

                    return result
                }, [])
                channelsWithProgrammes.push({
                    ...channel,
                    programmes: channelProgrammes
                })
            } catch (e) {
                this.logger.info(
                    `[XMLTV] Could not fetch EPG for channel ${channel.name}`
                )
                this.logger.error(e)
            }
        }

        const xmltv = this.buildEPGData(channelsWithProgrammes, startDate)
        this.saveEPGToFile(xmltv, true)
    }

    runJob(): void {
        const xmltvJob = new CronJob(
            this.config.services.xmltv.cronExpression,
            async () => {
                if (this.sessionService.authNSession !== null) await this.run()
            },
            null,
            false
        )
        xmltvJob.start()
    }
}

export default XMLTVService
