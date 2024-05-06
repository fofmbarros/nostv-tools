interface AuthZSessionResponse {
    access_token: string
    token_type: string
    scope: string
    expires_in: number
    issued_at: number
    status: string
    refresh_token: null
    refresh_token_expires_in: number
    refresh_token_issued_at: null
    refresh_token_status: null
    refresh_count: number
    id_token: string
}

interface AuthZSessionStorage {
    AccessToken: string
    ExpiresIn: number
    AccessTokenExpirationDate: string
    IdToken: string
    IssuedAt: number
    Scope: string
    Status: string
    TokenType: string
    UserSA: string
    UserCA: string
}

interface AuthNSessionResponse {
    access_token: string
    token_type: string
    scope: string
    expires_in: number
    issued_at: number
    status: string
    refresh_token: string
    refresh_token_expires_in: number
    refresh_token_issued_at: number
    refresh_token_status: string
    refresh_count: number
    id_token: string
}

interface AuthNSessionStorage {
    code: string
    id_token: string
    token_type: string
    scope: string
    profile: {
        session_guid: string
        sub: string
        birthdate: string
        gender: string
        preferred_username: string
        auth_home_gateway: string
        auth_client_ip: string
        user_parent_id: string
        user_person_id: string
        subscriber_id: string
        auth_time: number
        email: string
        jti: string
        user_ppm_profiles: string
        email_verified: boolean
        user_username: string
        user_ca: string
        phone_number_verified: boolean
        picture: string
        user_service_ids: string
        auth_user_agent: string
        country_code: string
        user_id: string
        user_identity_type: string
        name: string
        user_sa: string
        phone_number: string
        user_cpes: string
    }
    expires_at: number
    issued_at: number
    status: string
    refresh_token: string
    refresh_token_expires_in: number
    refresh_token_issued_at: number
    refresh_token_status: string
    refresh_count: number
}

interface SignInDeviceResponse {
    DeviceId: string
    Model: string
    DasEncriptedKey: string
    SignKeyId: string
    SignAlgo: string
    EncryptedSignKey: string
}

export type {
    AuthZSessionResponse,
    AuthZSessionStorage,
    AuthNSessionResponse,
    AuthNSessionStorage,
    SignInDeviceResponse
}
