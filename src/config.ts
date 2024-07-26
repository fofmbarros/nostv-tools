import type {
    FileServerServiceConfig,
    ProxyServiceConfig,
    SessionServiceConfig,
    XMLTVServiceConfig
} from './services/index.js'

interface ConfigEndpoints {
    ott: {
        channels: string
        epg: string
        player: {
            asset: string
        }
        signIn: string
    }
    images: string
    app: string
    oauth: {
        token: string
    }
    license: {
        widevine: {
            setup: string
            new: string
            renewal: string
            teardown: string
        }
    }
}

interface ConfigServices {
    fileServer: FileServerServiceConfig
    proxy: ProxyServiceConfig
    session: SessionServiceConfig
    xmltv: XMLTVServiceConfig
}

class Config {
    readonly appVersion: string
    readonly mpdUserAgent: string
    readonly services: ConfigServices

    readonly endpoints: ConfigEndpoints = {
        ott: {
            channels: 'https://tyr-prod.apigee.net/nostv/ott/channels',
            epg: 'https://tyr-prod.apigee.net/nostv/ott/schedule/range/contents',
            player: {
                // eslint-disable-next-line no-template-curly-in-string
                asset: 'https://tyr-prod.apigee.net/nostv/ott/v2/assets/${asset}/video/DASH/path'
            },
            signIn: 'https://tyr-prod.apigee.net/nostv/ott/devices/signin'
        },
        images: 'https://mage.stream.nos.pt/v1/nostv_mage/Images',
        app: 'https://nostv.pt/',
        oauth: {
            token: 'https://apigee.nos.pt/nosid/oauth2/v3/token'
        },
        license: {
            widevine: {
                setup: 'https://nos71zv1-ssm.anycast.nagra.com/NOS71ZV1/ssm/v1/sessions/setup',
                new: 'https://nos71zv1-ssm.anycast.nagra.com/NOS71ZV1/wvls/contentlicenseservice/v1/licenses',
                renewal:
                    'https://nos71zv1-ssm.anycast.nagra.com/NOS71ZV1/ssm/v1/renewal-license-wv',
                teardown:
                    'https://nos71zv1-ssm.anycast.nagra.com/NOS71ZV1/ssm/v1/sessions/teardown'
            }
        }
    }

    readonly chromiumPath: string

    constructor(
        appVersion: string,
        mpdUserAgent: string,
        services: ConfigServices,
        chromiumPath: string
    ) {
        this.appVersion = appVersion
        this.mpdUserAgent = mpdUserAgent
        this.services = services
        this.chromiumPath = chromiumPath
    }
}

export default Config
