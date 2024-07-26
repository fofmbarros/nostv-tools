import axios from 'axios'
import type { Logger } from 'pino'
import { CronJob } from 'cron'
import type {
    AuthNSessionStorage,
    AuthZSessionResponse,
    AuthZSessionStorage,
    SignInDeviceResponse
} from './session.dtos.js'
import { AuthZSession } from './session.entities.js'
import type Config from '../../config.js'
import type User from '../../user.js'
import { launch, type Page } from 'puppeteer-core'
import { readFileSync, writeFileSync } from 'node:fs'
import { sleep, __dirname } from '../../utils.js'
import { join } from 'node:path'

class SessionService {
    private readonly logger: Logger
    private readonly config: Config
    private readonly user: User

    authNSession: AuthNSessionStorage | null
    authZSession: AuthZSession | null
    dasSessionId: string | null
    device: SignInDeviceResponse | null
    page: Page | null

    constructor(logger: Logger, config: Config, user: User) {
        this.logger = logger
        this.config = config
        this.user = user

        this.authNSession = null
        this.authZSession = null
        this.dasSessionId = null
        this.device = null
        this.page = null
    }

    private async setupPage(
        authNSession: AuthNSessionStorage,
        authZSession: AuthZSession
    ): Promise<Page> {
        this.logger.info('[Session] Setting up app page..')

        const browser = await launch({
            headless: true,
            executablePath: this.config.chromiumPath
        })
        const page = await browser.newPage()

        await page.setUserAgent(this.user.userAgent)
        const redirected = await page.goto(this.config.endpoints.app, {
            waitUntil: 'domcontentloaded'
        })

        if (redirected == null)
            throw new Error('Could not redirect to app page')

        const authNStorageKey = `AuthN.${this.user.client.authNId}`
        const authNStorageValue = JSON.stringify(authNSession)

        const authZStorageKey = `AuthZ.${this.user.client.authZId}`
        const authZStorageValue = JSON.stringify(authZSession)

        const deviceIdStorageKey = 'deviceId'
        const deviceIdStorageValue = this.user.device.id

        const profileStorageKey = 'Profile'
        const profileStorageValue = JSON.stringify({
            profileId: this.user.client.profileId,
            created: new Date(authNSession.issued_at * 1000).toISOString()
        })

        const widevineLicenseReqPayloadStorageKey = 'widevineLicenseReqPayload'
        const widevineLicenseReqPayloadStorageValue =
            this.user.client.widevineLicenseReqPayload

        await page.evaluate(
            ({
                authNStorageKey,
                authNStorageValue,
                authZStorageKey,
                authZStorageValue,
                deviceIdStorageKey,
                deviceIdStorageValue,
                profileStorageKey,
                profileStorageValue,
                widevineLicenseReqPayloadStorageKey,
                widevineLicenseReqPayloadStorageValue
            }) => {
                localStorage.setItem(authNStorageKey, authNStorageValue)
                localStorage.setItem(authZStorageKey, authZStorageValue)
                localStorage.setItem(deviceIdStorageKey, deviceIdStorageValue)
                localStorage.setItem(profileStorageKey, profileStorageValue)
                localStorage.setItem(
                    widevineLicenseReqPayloadStorageKey,
                    widevineLicenseReqPayloadStorageValue
                )
            },
            {
                authNStorageKey,
                authNStorageValue,
                authZStorageKey,
                authZStorageValue,
                deviceIdStorageKey,
                deviceIdStorageValue,
                profileStorageKey,
                profileStorageValue,
                widevineLicenseReqPayloadStorageKey,
                widevineLicenseReqPayloadStorageValue
            }
        )
        await page.goto(this.config.endpoints.app)
        return page
    }

    private async openSession(): Promise<ReturnType<
        Window['openSession']
    > | null> {
        try {
            if (this.page === null) throw new Error('[Session] No page found.')
            const openSessionResponse = await this.page.evaluate(async () => {
                const response = await window.openSession()
                return response
            })
            return openSessionResponse
        } catch (e) {
            this.logger.error(e)
            return null
        }
    }

    private async getChallenge(
        dasSessionId: string
    ): Promise<ReturnType<Window['getChallenge']> | null> {
        try {
            if (this.page === null) throw new Error('[Session] No page found.')
            const getChallengeResponse = await this.page.evaluate(
                async ({ dasSessionId }) => {
                    const response = await window.getChallenge(dasSessionId)
                    return response
                },
                { dasSessionId }
            )
            return getChallengeResponse
        } catch (e) {
            this.logger.error(e)
            return null
        }
    }

    private async importLicense(
        dasSessionId: string,
        dasEncriptedKey: string
    ): Promise<boolean> {
        try {
            if (this.page === null) throw new Error('[Session] No page found.')
            await this.page.evaluate(
                async ({ dasSessionId, dasEncriptedKey }) => {
                    const response = await window.importLicense(
                        dasSessionId,
                        dasEncriptedKey
                    )
                    return response
                },
                { dasSessionId, dasEncriptedKey }
            )
            return true
        } catch (e) {
            this.logger.error(e)
            return false
        }
    }

    private async signInDevice(): Promise<{
        dasSessionId: string
        data: SignInDeviceResponse
    }> {
        const session = this.authZSession
        if (session === null) throw new Error('No session found.')
        const dasSessionResponse = await this.openSession()
        if (dasSessionResponse === null)
            throw new Error('Could not generate DAS session.')
        const dasSessionId = dasSessionResponse.data

        const challengeResponse = await this.getChallenge(dasSessionId)

        if (challengeResponse === null)
            throw new Error('Could not generate challenge.')
        const challenge = challengeResponse.data

        const { data } = await axios.post<SignInDeviceResponse>(
            this.config.endpoints.ott.signIn,
            {
                Challenge: challenge,
                DasScheme: 'web'
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': this.user.userAgent,
                    'X-Apikey': this.user.client.authZId,
                    'X-Core-DeviceBrandId': 'PC',
                    'X-Core-DeviceModelId': 'Firefox',
                    'X-Core-DeviceName': 'PC Firefox',
                    'X-Core-DeviceSubType': 'PC',
                    'X-Core-DeviceType': 'web',
                    Authorization: `Bearer ${session.AccessToken}`
                }
            }
        )

        return {
            dasSessionId,
            data
        }
    }

    async sign(
        dasSessionId: string,
        deviceSignKeyId: string
    ): Promise<{
        authorizationTime: string
        signature: Awaited<ReturnType<Window['sign']>>
    } | null> {
        try {
            if (this.page === null) throw new Error('[Session] No page found.')
            const authorizationTime = new Date().toISOString()
            const data = `x-core-accountid=${this.user.client.accountId},x-core-authorizationtime=${authorizationTime},x-core-profileid=${this.user.client.profileId}`

            const signResponse = await this.page.evaluate(
                async ({ dasSessionId, deviceSignKeyId, data }) => {
                    const response = await window.sign(
                        dasSessionId,
                        deviceSignKeyId,
                        data,
                        'String'
                    )
                    return response
                },

                { dasSessionId, deviceSignKeyId, data }
            )
            return {
                authorizationTime,
                signature: signResponse
            }
        } catch (e) {
            this.logger.error(e)
            return null
        }
    }

    private getAuthNSessionFromFile(): AuthNSessionStorage | null {
        this.logger.info('[Session] Reading AuthN session from file.')

        try {
            const sessionFile = readFileSync(
                join(__dirname, '../files/authNSession.json')
            )

            const sessionResponse: AuthNSessionStorage = JSON.parse(
                sessionFile.toString()
            )

            return sessionResponse
        } catch (e) {
            this.logger.error(e)
            return null
        }
    }

    private saveAuthNSessionToFile(authNSession: AuthNSessionStorage): boolean {
        this.logger.info('[Session] Saving AuthN session to file.')

        try {
            writeFileSync(
                join(__dirname, '../files/authNSession.json'),
                JSON.stringify(authNSession)
            )
            return true
        } catch (e) {
            this.logger.error(e)
            return false
        }
    }

    private getAuthZSessionFromFile(): AuthZSessionStorage | null {
        this.logger.info('[Session] Reading AuthZ session from file.')

        try {
            const sessionFile = readFileSync(
                join(__dirname, '../files/authZSession.json')
            )

            const sessionResponse: AuthZSessionStorage = JSON.parse(
                sessionFile.toString()
            )

            return sessionResponse
        } catch (e) {
            this.logger.error(e)
            return null
        }
    }

    private saveAuthZSessionToFile(authZSession: AuthZSessionStorage): boolean {
        this.logger.info('[Session] Saving AuthZ session to file.')

        try {
            writeFileSync(
                join(__dirname, '../files/authZSession.json'),
                JSON.stringify(authZSession)
            )
            return true
        } catch (e) {
            this.logger.error(e)
            return false
        }
    }

    private async fetchAuthZSession(
        idToken: string
    ): Promise<AuthZSessionResponse | null> {
        this.logger.info('[Session] Retrieving new AuthZ session.')

        try {
            const { data } = await axios.post<AuthZSessionResponse>(
                this.config.endpoints.oauth.token,
                new URLSearchParams({
                    client_id: this.user.client.authZId,
                    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                    assertion: idToken,
                    scope: 'openid profile customer_info offline_access'
                }),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        Authorization: `Basic ${this.user.client.authZBasic}`
                    }
                }
            )

            return data
        } catch (e) {
            this.logger.error(e)
            return null
        }
    }

    private async run(): Promise<void> {
        const currentAuthZSession = this.getAuthZSessionFromFile()
        if (currentAuthZSession === null)
            throw new Error('authZSession.json file is missing.')

        this.logger.info(
            `[Session] Current AuthZ session was valid until: ${new Date(
                currentAuthZSession.IssuedAt + currentAuthZSession.ExpiresIn
            ).toLocaleString()}`
        )

        const newAuthZSessionResponse = await this.fetchAuthZSession(
            currentAuthZSession.IdToken
        )
        if (newAuthZSessionResponse === null)
            throw new Error(
                'Could not generate a new session, fetch a new one from the app.'
            )

        const authZSession = AuthZSession.fromResponse(newAuthZSessionResponse)

        this.saveAuthZSessionToFile(authZSession)

        this.authZSession = authZSession
        this.logger.info(
            `[Session] New AuthZ session is valid until: ${new Date(
                currentAuthZSession.IssuedAt + currentAuthZSession.ExpiresIn
            ).toLocaleString()}`
        )

        const currentAuthNSession = this.getAuthNSessionFromFile()
        if (currentAuthNSession === null)
            throw new Error('authNSession.json file is missing.')

        this.authNSession = currentAuthNSession
        this.logger.info(
            `[Session] Current AuthN session is valid until: ${new Date(currentAuthNSession.expires_at * 1000).toLocaleString()}`
        )
    }

    private runJob(): void {
        const sessionJob = new CronJob(
            this.config.services.session.cronExpression,
            async () => {
                this.logger.info('[Session] Running session job.')
                await this.run()
            },
            null,
            false
        )
        sessionJob.start()
    }

    async setup(): Promise<void> {
        try {
            this.logger.info('[Session] Setting up service.')
            await this.run()
            if (this.authNSession === null || this.authZSession === null)
                throw new Error('[Session] Could not set up service.')
            this.page = await this.setupPage(
                this.authNSession,
                this.authZSession
            )
            await sleep(3)
            const { dasSessionId, data } = await this.signInDevice()
            await this.importLicense(dasSessionId, data.DasEncriptedKey)
            this.dasSessionId = dasSessionId
            this.device = data

            this.runJob()
        } catch (e) {
            this.logger.error(e)
        }
    }
}

export default SessionService
