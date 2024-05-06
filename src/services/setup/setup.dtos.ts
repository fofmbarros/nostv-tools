interface ChannelImage {
    ImageId: string
    Url: string
    Type: number
}

interface ChannelResponse {
    IsOnline: boolean
    IsWatchTogetherEnabled: boolean
    Rating: number
    Position: number
    IsTimeWarpable: boolean
    IsRestartable: boolean
    ServiceId: string
    ChannelId: string
    AssetId: string
    Name: string
    RatingDisplay: string
    DvbLocator: string
    TrayItemsLink: string
    QualityVersion: number
    PersonalSettings: {
        IsLocked: boolean
        IsSubscribed: boolean
        IsFavourite: boolean
        IsTimewarpEnabled: boolean
        IsLiveStartOverEnabled: boolean
        IsNpvrEnabled: boolean
        IsPlaybackEnabled: boolean
    }
    RecordingEvents: []
    ScheduledRecordingEvents: []
    Images: Array<ChannelImage>
}

export type { ChannelImage, ChannelResponse }
