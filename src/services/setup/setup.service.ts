import type { Logger } from 'pino'
import { readFileSync, writeFileSync } from 'node:fs'
import axios from 'axios'
import type { SessionService } from '../index.js'
import { Channel } from '../xmltv/xmltv.entities.js'
import type { ChannelResponse } from './setup.dtos.js'
import type Config from '../../config.js'
import type User from '../../user.js'
import { join } from 'node:path'
import { __dirname } from '../../utils.js'

class SetupService {
    private readonly logger: Logger
    private readonly config: Config
    private readonly user: User

    private readonly sessionService: SessionService
    channels: Array<Channel>
    playlist: string | null

    constructor(
        logger: Logger,
        config: Config,
        user: User,

        sessionService: SessionService
    ) {
        this.logger = logger
        this.config = config
        this.user = user

        this.sessionService = sessionService
        this.channels = []
        this.playlist = null
    }

    private async fetchChannels(): Promise<Array<ChannelResponse> | null> {
        this.logger.info('[Setup] Retrieving new channels.')

        try {
            const session = this.sessionService.authZSession
            if (session === null) throw new Error('No session found.')

            const { data } = await axios.get<Array<ChannelResponse>>(
                this.config.endpoints.ott.channels,
                {
                    params: {
                        access_token: session.AccessToken,
                        client_id: this.user.client.authZId
                    },
                    headers: {
                        'User-Agent': this.user.userAgent,
                        'X-Core-ProfileId': this.user.client.profileId,
                        'X-Core-DeviceId': this.user.device.id,
                        'X-Core-DeviceType': this.user.device.type,
                        'X-Core-AppVersion': this.config.appVersion,
                        'X-Core-ContentRatingLimit': '0',
                        'X-Apikey': this.user.client.authZId,
                        Authorization: `Bearer ${session.AccessToken}`
                    }
                }
            )

            return data
        } catch (e) {
            this.logger.error(e)
            return null
        }
    }

    private saveChannelsToFile(channels: Array<ChannelResponse>): boolean {
        this.logger.info('[Setup] Saving channels to file.')

        try {
            writeFileSync(
                join(__dirname, '../files/channels.json'),
                JSON.stringify(channels)
            )
            return true
        } catch (e) {
            this.logger.error(e)
            return false
        }
    }

    private getChannelsFromFile(): Array<ChannelResponse> | null {
        this.logger.info('[Setup] Getting channels from file.')

        try {
            const channelsFile = readFileSync(
                join(__dirname, '../files/channels.json')
            )

            const channelsResponse: Array<ChannelResponse> = JSON.parse(
                channelsFile.toString()
            )

            return channelsResponse
        } catch (e) {
            this.logger.error(e)
            return null
        }
    }

    private generatePlaylist(channels: Array<Channel>): string {
        this.logger.info('[Setup] Generating playlist.')

        const playlist = channels.reduce((result, channel) => {
            const channelIconSrc = new URL(this.config.endpoints.images)

            channelIconSrc.searchParams.append('sourceUri', channel.logo)
            channelIconSrc.searchParams.append('profile', 'ott_16_220x64')
            channelIconSrc.searchParams.append(
                'client_id',
                this.user.client.authZId
            )
            channelIconSrc.searchParams.append('format', 'image/png')

            result += `#EXTINF:-1 tvg-id="${channel.assetId}" tvg-logo="${channelIconSrc.toString()}",${channel.name}\n#KODIPROP:inputstream=inputstream.adaptive\n#KODIPROP:inputstream.adaptive.manifest_type=mpd\n#KODIPROP:inputstream.adaptive.license_type=com.widevine.alpha\n#KODIPROP:inputstream.adaptive.license_key=${this.config.services.proxy.publicUrl}:${this.config.services.proxy.port}/licenses\n#KODIPROP:inputstream.adaptive.license_flags=persistent_storage\n${this.config.services.proxy.publicUrl}:${this.config.services.proxy.port}/asset?id=${channel.assetId}\n\n`

            return result
        }, '#EXTM3U\n\n')

        return playlist
    }

    private savePlaylistToFile(playlist: string): boolean {
        try {
            this.logger.info('[Setup] Saving playlist.')

            writeFileSync(join(__dirname, '../files/playlist.m3u'), playlist)

            this.logger.info('[Setup] Playlist saved.')

            return true
        } catch (e) {
            this.logger.error(e)
            return false
        }
    }

    private getPlaylistFromFile(): string | null {
        try {
            this.logger.info('[Setup] Getting playlist from file.')

            const playlistFile = readFileSync(
                join(__dirname, '../files/playlist.m3u')
            )
            const playlist = playlistFile.toString()

            return playlist
        } catch (e) {
            if (e instanceof Error && 'errno' in e) {
                if (e.errno === -4058) {
                    this.logger.error('[Setup] Playlist file not found.')
                } else {
                    this.logger.error(e)
                }
            }
            return null
        }
    }

    async run(): Promise<void> {
        this.logger.info('[Setup] Running setup service.')

        try {
            let generateNewPlaylist = false
            let channelsResponse = this.getChannelsFromFile()
            // Channels file doesn't exist or no read permission
            if (channelsResponse === null) {
                generateNewPlaylist = true
                channelsResponse = await this.fetchChannels()
                if (channelsResponse === null)
                    throw new Error('Could not setup channels.')

                const saveChannelsResponseOK =
                    this.saveChannelsToFile(channelsResponse)
                if (!saveChannelsResponseOK)
                    throw new Error('Could not save channels file.')
            }

            const channels = channelsResponse.reduce<Array<Channel>>(
                (result, channelResponse) => {
                    const channel = Channel.fromResponse(channelResponse)
                    result.push(channel)

                    return result
                },
                []
            )

            this.channels = channels

            let playlist = this.getPlaylistFromFile()
            // Playlist file doesn't exist or no read permission
            if (playlist === null || generateNewPlaylist) {
                playlist = this.generatePlaylist(channels)

                const savePlaylistOK = this.savePlaylistToFile(playlist)
                if (!savePlaylistOK)
                    throw new Error('Could not save playlist file.')
            }

            this.playlist = playlist
        } catch (e) {
            this.logger.error(e)
        }
    }
}

export default SetupService
