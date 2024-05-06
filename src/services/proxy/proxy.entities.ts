import type {
    AssetResponse,
    ClmTokenPayload,
    LicenseSessionPayload
} from './proxy.dtos.js'
import { type JwtPayload, decode } from 'jsonwebtoken'

enum LicenseType {
    SERVICE_CERTIFICATE_REQUEST,
    LICENSE_REQUEST_NEW,
    LICENSE_REQUEST_RENEWAL
}

class LicenseSession {
    readonly expiration: Date

    constructor(expiration: Date) {
        this.expiration = expiration
    }

    static fromToken(token: string): LicenseSession {
        const payload = decode(token) as LicenseSessionPayload

        const licenseSession = new LicenseSession(new Date(payload.exp * 1000))
        return licenseSession
    }

    isExpired(): boolean {
        return this.expiration < new Date()
    }
}

class ClmToken {
    readonly jti: string
    readonly accountId: string
    readonly expiration: Date

    constructor(jti: string, accountId: string, expiration: Date) {
        this.jti = jti
        this.accountId = accountId
        this.expiration = expiration
    }

    static fromToken(token: string): ClmToken {
        const payload = decode(token) as ClmTokenPayload

        const clmToken = new ClmToken(
            payload.jti,
            payload.device.accountId,
            new Date(payload.exp * 1000)
        )
        return clmToken
    }

    isExpired(): boolean {
        return this.expiration < new Date()
    }
}

class Asset {
    readonly path: string
    readonly clmToken: string
    readonly live: boolean
    readonly subscribed: boolean

    constructor(
        path: string,
        clmToken: string,
        live: boolean,
        subscribed: boolean
    ) {
        this.path = path
        this.clmToken = clmToken
        this.live = live
        this.subscribed = subscribed
    }

    static fromResponse(response: AssetResponse): Asset {
        const asset = new Asset(
            response.Path,
            response.ClmToken,
            response.Metadata.Service === 'EPGC',
            true
        )
        return asset
    }
}

class AssetSession {
    readonly assetId: string
    readonly clmToken: string
    licenseSessionToken: string

    constructor(
        assetId: string,
        clmToken: string,
        licenseSessionToken: string
    ) {
        this.assetId = assetId
        this.clmToken = clmToken
        this.licenseSessionToken = licenseSessionToken
    }

    isValid(): boolean {
        const decodedToken = decode(this.licenseSessionToken) as JwtPayload
        return decodedToken.exp !== undefined
            ? decodedToken.exp > Math.floor(Date.now() / 1000)
            : false
    }
}

export { LicenseSession, LicenseType, ClmToken, Asset, AssetSession }
