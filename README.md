<p align="center">
  <img src="assets/nostv.svg">
</p>

# NOSTV Tools

NOSTV Tools is a collection of tools in which customers of portuguese ISP provider "NOS" can use its IPTV service "NOS TV" outside their web/platform specific applications. It features:

-   A **proxy server** to reverse engineer NAGRA's DRM Widevine requests into _"standard"_ Widevine requests
-   A file server which hosts a `playlist.m3u` file (generated at the initial setup) as well as an `epg.xml.gz` (with a configurable fetch interval) file for the programming guide
-   **1080p playback of streams**, usually reserved for Android TV / Apple TV (may require a NOSTV+ subscription)

## Initial setup

-   Install the dependencies (`npm i`)
-   Build the source code (`npm run build`)
-   Create a `files` directory in the same level as `dist`

    -   Two files need to be placed in a `files` directory:

        -   `authNSession.json` - Copy the value found in `localStorage` under `AuthN.XXX`
        -   `authZSession.json` - Copy the value found in `localStorage` under `AuthZ.XXX`

        -   `user.json`

            **Info**: `https://nostv.pt/config.json` request can be intercepted when entering `nostv.pt`

            -   client

                -   `authNId` - Found in `https://nostv.pt/config.json` under `Login` -> `ClientIdAuthN`
                -   `authNBasic` - Found in `https://nostv.pt/config.json` under `Login` -> `BasicAuthN`
                -   `authZId` - Found in `https://nostv.pt/config.json` under `Login` -> `ClientIdAuthZ`
                -   `authZBasic` - Found in `https://nostv.pt/config.json` under `Login` -> `BasicAuthZ`
                -   `accountId` - Found in `localStorage`, under `AuthZ.XXX` key, `UserSA` attribute
                -   `profileId` - Found in `localStorage`, under `Profile` key
                -   `widevineLicenseReqPayload` - Found in `localStorage`, under same key name

            -   device
                -   `id` - Found in `localStorage`, under same key name
                -   `subType` - `PC` or `Mac`
                -   `brandId` - `PC` or `Mac`
                -   `modelId` - `Chrome` or `Firefox`
                -   `name` - Any name e.g: `PC Firefox`
                -   `type` - `web`

```json
{
    "client": {
        "authNId": "XXX",
        "authNBasic": "XXX",
        "authZId": "XXX",
        "authZBasic": "XXX",
        "accountId": "XXX",
        "profileId": "XXX",
        "widevineLicenseReqPayload": "XXX"
    },
    "device": {
        "id": "XXX",
        "subType": "XXX",
        "brandId": "XXX",
        "modelId": "XXX",
        "name": "XXX",
        "type": "XXX"
    }
}
```

## Usage

### Dash.js (Example)

Full implementation: https://reference.dashif.org/dash.js/nightly/samples/drm/widevine.html

```javascript
var protData = {
    'com.widevine.alpha': {
        serverURL: 'PROXY_URL:PROXY_PORT/licenses'
    }
}
var video,
    player,
    url = 'PROXY_URL:PROXY_PORT/asset/ASSET_ID'

video = document.querySelector('video')
player = dashjs.MediaPlayer().create()
player.initialize(video, url, true)
player.setProtectionData(protData)
```

### Generic IPTV Players

Use the `playlist.m3u` and `epg.xml.gz` files

e.g:

-   Kodi with PVR IPTV Simple Client (https://kodi.wiki/view/Add-on:PVR_IPTV_Simple_Client)
-   Android TV Box with Tivimate (https://play.google.com/store/apps/details?id=ar.tvplayer.tv)

Any player which supports the `KODIPROP` in a playlist file should work correctly.

## Docker

A docker image can be built using `npm run docker:build`
The following environment variables are available:

-   `CONFIG_FILESERVER_DISABLED`
-   `CONFIG_PROXY_DISABLED`
-   `CONFIG_PROXY_PUBLIC_URL` - Should be defined so that the `playlist.m3u` file is generated correctly
-   `CONFIG_SESSION_DISABLED`
-   `CONFIG_SESSION_CRON`
-   `CONFIG_XMLTV_DISABLED`
-   `CONFIG_XMLTV_CRON`

Example `docker-compose.yml` file:

```yaml
services:
    nostv-tools:
        image: nostv:latest
        container_name: nostv-tools
        environment:
            CONFIG_PROXY_PUBLIC_URL: http://192.168.1.2:6200
        ports:
            - '6200:6200'
            - '6201:6201'
        volumes:
            - ./nostv:/app/nostv/files
```

## Disclaimer

This is an unofficial set of tools. It is not related to _NOS, Comunicações SA_, _nos.pt_ or _nostv.pt_. It may stop working at any time.

## References

-   NOS (https://nos.pt/)
-   NOSTV (https://nostv.pt/)
-   NOSTV+ (https://forum.nos.pt/servicos-89/app-nos-tv-para-android-tv-e-apple-tv-conheca-a-nos-tv-27751)
-   NAGRA CONNECT Player (https://docs.nagra.com/connect-player-sdk-5-for-browsers/5.19.x/Default/)

### TODO

-   Add links to programmes in the EPG
