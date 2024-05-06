export {}

declare global {
    interface PageOperationResponse<T> {
        data: T
        message: string
        status: string
    }

    interface Window {
        openSession: () => Promise<PageOperationResponse<string>>
        getChallenge: (
            dasSessionId: string
        ) => Promise<PageOperationResponse<string>>
        importLicense: (
            dasSessionId: string,
            dasEncriptedKey: string
        ) => Promise<PageOperationResponse<string>>
        sign: (
            dasSessionId: string,
            deviceSignKeyId: string,
            data: string,
            type: string
        ) => Promise<PageOperationResponse<Array<number>>>
    }
}
