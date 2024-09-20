export type MasterVolumeDialState = {
    muted: boolean;
    volume: number;

    disabled?: boolean;
};

export type VolumeDialState = {
    muted: boolean;
    sent: boolean;
    volume: number;

    disabled?: boolean;
};

export type TransitionState = {
    active: boolean;
    preview: boolean;
    overlay: boolean;

    disabled?: boolean;
};

export type ExternalState = {
    active: boolean;

    disabled?: boolean;
};

export type StreamState = {
    active: boolean;

    disabled?: boolean;
};

export type PictureState = {
    active: boolean;
    preview: boolean;
    overlay: boolean;


    disabled?: boolean;
};