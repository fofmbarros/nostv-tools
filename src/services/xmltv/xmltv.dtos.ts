interface ChannelImageDetail {
    ImageId: string
    Url: string
    Type: number
}

interface ChannelProgrammeResponse {
    CoreId: string
    AssetId: string
    ContentId: string
    ProgramId: string
    AggregatorId: string
    DateFullEventId: string
    GridItemsLink: string
    PlayListTrayItemLink: string
    UtcDateTimeStart: string
    UtcDateTimeEnd: string
    Type: number
    IsAdult: boolean
    AiringChannel: {
        IsOnline: boolean
        IsTimeWarpable: boolean
        IsRestartable: boolean
        ServiceId: string
        ChannelId: string
        AssetId: string
        Name: string
        RatingDisplay: string
        DvbLocator: string
        Rating: number
        Position: number
        QualityVersion: number
        Images: Array<ChannelImageDetail>
        PersonalSettings: {
            IsPlaybackEnabled: boolean
            IsSubscribed: boolean
        }
    }
    Metadata: {
        Title: string
        SubTitle?: string
        RatingDisplay: string
        GenreDisplay: string
        SeriesId: string
        Description: string
        ImdbRating?: string
        ReleaseYear: string
        Rating: number
        Season: number
        Episode: number
        Duration: number
        ProgramId: number
        AggregatorId: number
        IsNPVR: boolean
        IsStartOver: boolean
    }
    Images: Array<ChannelImageDetail>
    PersonalSettings: {
        IsPlaybackEnabled: boolean
        IsSubscribed: boolean
    }
}

export type { ChannelImageDetail, ChannelProgrammeResponse }
