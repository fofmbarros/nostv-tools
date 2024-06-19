import express, { type RequestHandler, type Express, raw } from 'express'
import cors from 'cors'
import type { Logger } from 'pino'
import axios from 'axios'
import type { SessionService } from '../index.js'
import type {
    AssetResponse,
    NewLicenseResponse,
    RenewalLicenseResponse,
    AssetLicenseSessionResponse
} from './proxy.dtos.js'
import { z } from 'zod'
import { Asset, AssetSession, LicenseType } from './proxy.entities.js'
import type Config from '../../config.js'
import type User from '../../user.js'

class ProxyService {
    private readonly logger: Logger
    private readonly config: Config
    private readonly user: User
    private readonly sessionService: SessionService

    private readonly app: Express
    private assetSession: AssetSession | null

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
        this.app = express()
        this.assetSession = null
    }

    private async fetchAsset(assetId: string): Promise<AssetResponse> {
        const session = this.sessionService.authZSession
        const dasSessionId = this.sessionService.dasSessionId
        const device = this.sessionService.device
        if (session === null) throw new Error('No session found.')
        if (dasSessionId === null) throw new Error('No DAS session found.')
        if (device === null) throw new Error('No device found.')

        const signResponse = await this.sessionService.sign(
            dasSessionId,
            device.SignKeyId
        )

        if (signResponse === null) throw new Error('No signature response.')
        const signature = signResponse.signature.data.join()

        const { data } = await axios.get<AssetResponse>(
            this.config.endpoints.ott.player.asset.replace(
                // eslint-disable-next-line no-template-curly-in-string
                '${asset}',
                assetId
            ),
            {
                params: {
                    sessionType: 'view',
                    access_token: session.AccessToken,
                    client_id: this.user.client.authZId
                },
                headers: {
                    'X-Core-AuthorizationTime': signResponse.authorizationTime,
                    'X-Core-SignAlgo': device.SignAlgo,
                    'X-Core-SignKey': device.EncryptedSignKey,
                    'X-Core-Signature': signature,
                    'X-Core-DeviceSubType': this.user.device.subType,
                    'X-Core-DeviceBrandId': this.user.device.brandId,
                    'X-Core-DeviceModelId': this.user.device.modelId,
                    'X-Core-DeviceName': this.user.device.name,
                    'X-Core-DeviceType': this.user.device.type,
                    'X-Core-DeviceId': this.user.device.id,
                    'X-Core-ProfileId': this.user.client.profileId,
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

    private async fetchAssetLicenseSession(
        clmToken: string
    ): Promise<AssetLicenseSessionResponse> {
        const { data } = await axios.post<AssetLicenseSessionResponse>(
            this.config.endpoints.license.widevine.setup,
            undefined,
            {
                headers: {
                    'nv-authorizations': clmToken,
                    'User-Agent': this.user.userAgent
                }
            }
        )
        return data
    }

    private async fetchLicense(
        clmToken: string,
        sessionToken: string,
        challenge: string
    ): Promise<NewLicenseResponse> {
        const { data } = await axios.post<NewLicenseResponse>(
            this.config.endpoints.license.widevine.new,
            {
                challenge
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'nv-authorizations': `${clmToken},${sessionToken}`,
                    'User-Agent': this.user.userAgent
                }
            }
        )
        return data
    }

    private async renewLicense(
        sessionToken: string,
        challenge: string
    ): Promise<RenewalLicenseResponse> {
        const { data } = await axios.post<RenewalLicenseResponse>(
            this.config.endpoints.license.widevine.renewal,
            {
                challenge
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'nv-authorizations': sessionToken,
                    'User-Agent': this.user.userAgent
                }
            }
        )

        return data
    }

    private async teardownAssetLicenseSession(
        sessionToken: string
    ): Promise<void> {
        await axios.post(
            this.config.endpoints.license.widevine.teardown,
            undefined,
            {
                headers: {
                    'nv-authorizations': sessionToken,
                    'User-Agent': this.user.userAgent
                }
            }
        )
    }

    private getRequestMessageType(base64License: string): LicenseType {
        if (base64License === 'CAQ=')
            return LicenseType.SERVICE_CERTIFICATE_REQUEST
        if (base64License.length > 2000) return LicenseType.LICENSE_REQUEST_NEW
        return LicenseType.LICENSE_REQUEST_RENEWAL
    }

    run(): void {
        this.app.use(
            cors({
                origin: '*'
            })
        )

        this.app.get('/asset', raw({ type: 'application/dash+xml' }), (async (
            req,
            res
        ) => {
            this.logger.info('[Proxy] Asset endpoint called.')

            try {
                const requestSchema = z.object({
                    query: z.object({
                        id: z.string()
                    })
                })

                const { query } = requestSchema.parse(req)

                this.logger.info(`[Proxy] Asset: ${query.id}.`)

                const assetResponse = await this.fetchAsset(query.id)

                if (this.assetSession !== null)
                    try {
                        this.logger.info(
                            `[Proxy] Tearing down current ${this.assetSession.assetId} asset session.`
                        )
                        await this.teardownAssetLicenseSession(
                            this.assetSession.licenseSessionToken
                        )
                    } catch (e) {
                        this.logger.error(e)
                    }

                const asset = Asset.fromResponse(assetResponse)

                const assetLicenseSessionResponse =
                    await this.fetchAssetLicenseSession(asset.clmToken)

                this.assetSession = new AssetSession(
                    query.id,
                    asset.clmToken,
                    assetLicenseSessionResponse.sessionToken
                )

                const mpdFileResponse = await axios.get<string>(asset.path, {
                    headers: {
                        'User-Agent': this.config.mpdUserAgent
                    }
                })

                res.setHeader('Content-Type', 'application/dash+xml')
                res.send(mpdFileResponse.data)
            } catch (e) {
                this.logger.error(e)
                res.sendStatus(400)
            }
        }) as RequestHandler)

        this.app.post(
            '/licenses',
            raw({ type: 'application/octet-stream' }),
            (async (req, res) => {
                this.logger.info('[Proxy] Licenses endpoint called.')
                try {
                    const requestSchema = z.object({
                        body: z.instanceof(Buffer)
                    })

                    const { body } = requestSchema.parse(req)

                    const assetSession = this.assetSession

                    if (assetSession === null)
                        throw new Error('Could not found asset session.')

                    const challengeb64 = body.toString('base64')
                    const licenseType = this.getRequestMessageType(challengeb64)
                    let license64: string

                    this.logger.info(
                        `[Proxy] License type: ${LicenseType[licenseType]}`
                    )
                    if (
                        licenseType ===
                            LicenseType.SERVICE_CERTIFICATE_REQUEST ||
                        licenseType === LicenseType.LICENSE_REQUEST_NEW
                    ) {
                        const fetchLicenseResponse = await this.fetchLicense(
                            assetSession.clmToken,
                            assetSession.licenseSessionToken,
                            challengeb64
                        )
                        license64 = fetchLicenseResponse.license[0]
                    } else {
                        const renewLicenseResponse = await this.renewLicense(
                            assetSession.licenseSessionToken,
                            challengeb64
                        )
                        license64 = renewLicenseResponse.license

                        if (this.assetSession !== null) {
                            this.assetSession.licenseSessionToken =
                                renewLicenseResponse.sessionToken
                        }
                    }

                    const licenseBuf = Buffer.from(license64, 'base64')
                    res.setHeader('Content-Type', 'application/octet-stream')
                    res.send(licenseBuf)
                } catch (e) {
                    this.logger.error(e)
                    res.sendStatus(400)
                }
            }) as RequestHandler
        )

        this.app.post('/teardown', (async (req, res) => {
            this.logger.info('[Proxy] Teardown endpoint called.')
            try {
                const requestSchema = z.object({
                    body: z.object({
                        sessionToken: z.string()
                    })
                })

                const { body } = requestSchema.parse(req)
                await this.teardownAssetLicenseSession(body.sessionToken)
                res.sendStatus(200)
            } catch (e) {
                this.logger.error(e)
                res.sendStatus(400)
            }
        }) as RequestHandler)

        this.app.listen(this.config.services.proxy.port, () => {
            this.logger.info(
                `[Proxy] running on port ${this.config.services.proxy.port}.`
            )
        })
    }
}

export default ProxyService
