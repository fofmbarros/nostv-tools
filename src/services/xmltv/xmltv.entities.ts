import type { ChannelResponse } from '../setup/setup.dtos.js'
import type { ChannelProgrammeResponse } from './xmltv.dtos.js'

class ChannelProgramme {
    readonly title: string
    readonly subtitle: string | null
    readonly description: string | null
    readonly image: string
    readonly season: number
    readonly episode: number
    readonly startDate: Date
    readonly endDate: Date
    readonly category: string
    readonly igacRating: string
    readonly imdbRating: string | null

    constructor(
        title: string,
        subtitle: string | null,
        description: string | null,
        image: string,
        season: number,
        episode: number,
        startDate: Date,
        endDate: Date,
        category: string,
        igacRating: string,
        imdbRating: string | null
    ) {
        this.title = title
        this.subtitle = subtitle
        this.description = description
        this.image = image
        this.season = season
        this.episode = episode
        this.startDate = startDate
        this.endDate = endDate
        this.category = category
        this.igacRating = igacRating
        this.imdbRating = imdbRating
    }

    static fromResponse(response: ChannelProgrammeResponse): ChannelProgramme {
        const channelProgramme = new ChannelProgramme(
            response.Metadata.Title,
            response.Metadata.SubTitle ?? null,
            response.Metadata.Description ?? null,
            response.Images[0].Url,
            response.Metadata.Season,
            response.Metadata.Episode,
            new Date(response.UtcDateTimeStart),
            new Date(response.UtcDateTimeEnd),
            response.Metadata.GenreDisplay,
            response.Metadata.RatingDisplay,
            response.Metadata.ImdbRating ?? null
        )
        return channelProgramme
    }
}

class Channel {
    readonly serviceId: string
    readonly assetId: string
    readonly name: string
    readonly logo: string
    programmes: Array<ChannelProgramme>

    constructor(
        serviceId: string,
        assetId: string,
        name: string,
        logo: string,
        programmes: Array<ChannelProgramme>
    ) {
        this.serviceId = serviceId
        this.assetId = assetId
        this.name = name
        this.logo = logo
        this.programmes = programmes
    }

    static fromResponse(response: ChannelResponse): Channel {
        const channel = new Channel(
            response.ServiceId,
            response.AssetId,
            response.Name,
            response.Images[0].Url,
            []
        )
        return channel
    }
}

export { ChannelProgramme, Channel }
