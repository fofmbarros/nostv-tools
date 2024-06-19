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

class AuthZSession implements AuthZSessionStorage {
    readonly AccessToken: string
    readonly ExpiresIn: number
    readonly AccessTokenExpirationDate: string
    readonly IdToken: string
    readonly IssuedAt: number
    readonly Scope: string
    readonly Status: string
    readonly TokenType: string
    readonly UserSA: string
    readonly UserCA: string

    constructor(
        AccessToken: string,
        ExpiresIn: number,
        AccessTokenExpirationDate: string,
        IdToken: string,
        IssuedAt: number,
        Scope: string,
        Status: string,
        TokenType: string,
        UserSA: string,
        UserCA: string
    ) {
        this.AccessToken = AccessToken
        this.ExpiresIn = ExpiresIn
        this.AccessTokenExpirationDate = AccessTokenExpirationDate
        this.IdToken = IdToken
        this.IssuedAt = IssuedAt
        this.Scope = Scope
        this.Status = Status
        this.TokenType = TokenType
        this.UserSA = UserSA
        this.UserCA = UserCA
    }

    static fromResponse(response: AuthZSessionResponse): AuthZSession {
        const payload = decode(response.id_token) as {
            user_ca: string
            user_sa: string
        }

        return new AuthZSession(
            response.access_token,
            response.expires_in,
            new Date(
                // eslint-disable-next-line @typescript-eslint/restrict-plus-operands, @typescript-eslint/no-non-null-assertion
                response.refresh_token_issued_at! +
                    response.refresh_token_expires_in
            ).toISOString(),
            response.id_token,
            response.issued_at,
            response.scope,
            response.status,
            response.token_type,
            payload.user_sa,
            payload.user_ca
        )
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
