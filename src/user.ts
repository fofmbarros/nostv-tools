export interface UserClient {
    authNId: string
    authNBasic: string
    authZId: string
    authZBasic: string
    accountId: string
    profileId: string
    widevineLicenseReqPayload: string
}

export interface UserDevice {
    id: string
    subType: string
    brandId: string
    modelId: string
    name: string
    type: string
}

class User {
    readonly client: UserClient
    readonly device: UserDevice
    readonly userAgent: string

    constructor(client: UserClient, device: UserDevice, userAgent: string) {
        this.client = client
        this.device = device
        this.userAgent = userAgent
    }
}

export default User
