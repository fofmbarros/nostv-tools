/* eslint-disable @typescript-eslint/naming-convention */
import {
    type AuthZSessionStorage,
    type AuthZSessionResponse,
    type AuthNSessionResponse
} from './session.dtos.js'
import { decode } from 'jsonwebtoken'

interface XCoreSignature {
    algorithm: string
    key: string
    value: string
}

interface XCoreDevice {
    subType: string
    brandId: string
    modelId: string
    name: string
    type: string
}

class XCore {
    readonly authorizationTime: string
    readonly signature: XCoreSignature
    readonly device: XCoreDevice
    readonly appVersion: string
    readonly contentRatingLimit: string

    constructor(
        authorizationTime: string,
        signature: XCoreSignature,
        device: XCoreDevice,
        appVersion: string,
        contentRatingLimit: string
    ) {
        this.authorizationTime = authorizationTime
        this.signature = signature
        this.device = device
        this.appVersion = appVersion
        this.contentRatingLimit = contentRatingLimit
    }
}

class AuthZSession implements AuthZSessionResponse {
    readonly access_token: string
    readonly token_type: string
    readonly scope: string
    readonly expires_in: number
    readonly issued_at: number
    readonly status: string
    readonly refresh_token: null
    readonly refresh_token_expires_in: number
    readonly refresh_token_issued_at: null
    readonly refresh_token_status: null
    readonly refresh_count: number
    readonly id_token: string

    constructor(
        access_token: string,
        token_type: string,
        scope: string,
        expires_in: number,
        issued_at: number,
        status: string,
        refresh_token: null,
        refresh_token_expires_in: number,
        refresh_token_issued_at: null,
        refresh_token_status: null,
        refresh_count: number,
        id_token: string
    ) {
        this.access_token = access_token
        this.token_type = token_type
        this.scope = scope
        this.expires_in = expires_in
        this.issued_at = issued_at
        this.status = status
        this.refresh_token = refresh_token
        this.refresh_token_expires_in = refresh_token_expires_in
        this.refresh_token_issued_at = refresh_token_issued_at
        this.refresh_token_status = refresh_token_status
        this.refresh_count = refresh_count
        this.id_token = id_token
    }

    static fromResponse(response: AuthZSessionResponse): AuthZSession {
        return new AuthZSession(
            response.access_token,
            response.token_type,
            response.scope,
            response.expires_in,
            response.issued_at,
            response.status,
            response.refresh_token,
            response.refresh_token_expires_in,
            response.refresh_token_issued_at,
            response.refresh_token_status,
            response.refresh_count,
            response.id_token
        )
    }

    toStorage(): AuthZSessionStorage {
        const payload = decode(this.id_token) as {
            user_ca: string
            user_sa: string
        }

        return {
            AccessToken: this.access_token,
            ExpiresIn: this.expires_in,
            AccessTokenExpirationDate: new Date(
                this.issued_at + this.expires_in
            ).toISOString(),
            IdToken: this.id_token,
            IssuedAt: this.issued_at,
            Scope: this.scope,
            Status: this.status,
            TokenType: this.token_type,
            UserSA: payload.user_sa,
            UserCA: payload.user_ca
        }
    }
}

class AuthNSession implements AuthNSessionResponse {
    readonly access_token: string
    readonly token_type: string
    readonly scope: string
    readonly expires_in: number
    readonly issued_at: number
    readonly status: string
    readonly refresh_token: string
    readonly refresh_token_expires_in: number
    readonly refresh_token_issued_at: number
    readonly refresh_token_status: string
    readonly refresh_count: number
    readonly id_token: string

    constructor(
        access_token: string,
        token_type: string,
        scope: string,
        expires_in: number,
        issued_at: number,
        status: string,
        refresh_token: string,
        refresh_token_expires_in: number,
        refresh_token_issued_at: number,
        refresh_token_status: string,
        refresh_count: number,
        id_token: string
    ) {
        this.access_token = access_token
        this.token_type = token_type
        this.scope = scope
        this.expires_in = expires_in
        this.issued_at = issued_at
        this.status = status
        this.refresh_token = refresh_token
        this.refresh_token_expires_in = refresh_token_expires_in
        this.refresh_token_issued_at = refresh_token_issued_at
        this.refresh_token_status = refresh_token_status
        this.refresh_count = refresh_count
        this.id_token = id_token
    }

    static fromResponse(response: AuthNSessionResponse): AuthNSession {
        return new AuthNSession(
            response.access_token,
            response.token_type,
            response.scope,
            response.expires_in,
            response.issued_at,
            response.status,
            response.refresh_token,
            response.refresh_token_expires_in,
            response.refresh_token_issued_at,
            response.refresh_token_status,
            response.refresh_count,
            response.id_token
        )
    }
}

export { XCore, AuthZSession, AuthNSession }
