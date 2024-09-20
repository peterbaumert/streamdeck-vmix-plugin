import { Action } from "@elgato/streamdeck";
import { InputVolumeSettings, TransitionSettings, MasterVolumeSettings, ExternalSettings, StreamSettings } from "./settings"

export type Input = {
    number: string;
    action: Action;
    that: any;
    settings: InputVolumeSettings;
};

export type Master = {
    action: Action;
    that: any;
    settings: MasterVolumeSettings;
};

export type External = {
    action: Action;
    that: any;
    settings: ExternalSettings;
};

export type Stream = {
    action: Action;
    that: any;
    settings: StreamSettings;
};

export type Transition = {
    number: string;
    action: Action;
    that: any;
    settings: TransitionSettings;
}
