interface AssetResponse {
    Path: string
    Offset: number
    SessionId: string
    Type: number
    LicenseProvider: number
    ClmToken: string
    SessionControl: boolean
    Metadata: {
        AssetId: string
        Service: 'EPGC' | 'startover'
        AppReq: string
        StreamType: null
    }
}

interface AssetErrorResponse {
    Error: {
        Code: string
        Title: string
        Message: string
        CorrelationId: string
        UiType: number
    }
}

interface ClmTokenPayload {
    typ: 'ContentAuthZ'
    ver: '1.0'
    jti: string
    device: {
        accountId: string
    }
    contentRights: [
        {
            sessionControl: {
                sessionId: string
                groups: [
                    {
                        groupId: string
                        maxSessions: number
                    }
                ]
            }
            contentId: string
            usageRulesProfileId: string
            duration: number
        }
    ]
    exp: number
}

interface LicenseSessionPayload {
    requestTokenSignature: string
    accountId: string
    ver: 2.0
    heartbeat: number
    shortValidityDuration: number
    tenantId: string
    typ: 'Session'
    sessionId: string
    exp: number
}

interface AssetLicenseSessionResponse {
    heartbeat: number
    sessionToken: string
}

interface NewLicenseResponse {
    status: 'OK'
    errorCode: 0
    license: Array<string>
}

interface RenewalLicenseResponse {
    license: string
    sessionToken: string
    errorCode: 0
}

export type {
    AssetResponse,
    AssetErrorResponse,
    ClmTokenPayload,
    LicenseSessionPayload,
    AssetLicenseSessionResponse,
    NewLicenseResponse,
    RenewalLicenseResponse
}
