import { ActionContext } from "@elgato/streamdeck";

import { ExternalSettings, InputVolumeSettings, MasterVolumeSettings, PictureSettings, StreamSettings, TransitionSettings } from "./settings";

export type Input = {
	number: string;
	action: ActionContext;
	that: any;
	settings: InputVolumeSettings;
};

export type Master = {
	action: ActionContext;
	that: any;
	settings: MasterVolumeSettings;
};

export type External = {
	action: ActionContext;
	that: any;
	settings: ExternalSettings;
};

export type Stream = {
	action: ActionContext;
	that: any;
	settings: StreamSettings;
};

export type Transition = {
	number: string;
	action: ActionContext;
	that: any;
	settings: TransitionSettings;
};

export type Picture = {
	number: string;
	action: ActionContext;
	that: any;
	settings: PictureSettings;
};
