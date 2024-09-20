export type GlobalSettings = {
    endpoint: string;
}

export type InputVolumeSettings = {
    input: string;
    title: string;
    steps: number;
};

export type MasterVolumeSettings = {
    title: string;
    steps: number;
};

export type TransitionSettings = {
    input: string;
    title: string;
    transition: string;
    overlay: string;
}

export type ExternalSettings = {
    title: string;
};

export type StreamSettings = {
    title: string;
};