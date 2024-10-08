import streamDeck, { ActionContext } from "@elgato/streamdeck";
import { ConnectionTCP } from "node-vmix";
import { XmlApi } from "vmix-js-utils";
import { MasterAudioBus } from "vmix-js-utils/dist/types/audio-bus";
import { BaseInput } from "vmix-js-utils/dist/types/inputs";
import { VideoInput } from "vmix-js-utils/dist/types/inputs/video";
import { OverlayChannel } from "vmix-js-utils/dist/types/overlay-channel";
import XmlState from "vmix-js-utils/dist/xml-api/general-state";

import { External, Input, Master, Picture, Stream, Transition } from "../../types/misc";
import { GlobalSettings, TransitionSettings } from "../../types/settings";

const logger = streamDeck.logger.createScope("vMix");

export class vMix {
	private static _instance: vMix;

	public connection: ConnectionTCP;
	private connected: boolean = false;
	private host: string;
	public inputs: BaseInput[] = [];
	private master: MasterAudioBus | null = null;
	private active: number = 0;
	private preview: number = 0;
	private overlays: { [key: number]: OverlayChannel };
	private transitionList: Transition[] = [];
	private inputList: Input[] = [];
	private masterList: Master[] = [];
	private externalList: External[] = [];
	private streamList: Stream[] = [];
	private pictureList: Picture[] = [];
	private generalState: XmlState;
	private external: boolean = false;
	private stream: boolean = false;

	constructor() {
		this.host = "";
		this.connection = new ConnectionTCP();
	}

	async setup() {
		let globalSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
		this.host = globalSettings.endpoint;
		this.connection = new ConnectionTCP(this.host);

		// Listener for tally
		this.connection.on("tally", (tally: string) => {
			var d = tally.split("");
			logger.debug("Received tally state from vMix instance via TCP socket: " + d);
		});

		this.connection.on("xml", (xmlData: string) => {
			const xmlContent = XmlApi.DataParser.parse(xmlData);
			const inputsRawData = XmlApi.Inputs.extractInputsFromXML(xmlContent);
			this.inputs = XmlApi.Inputs.map(inputsRawData);
			this.master = XmlApi.AudioBusses.master(xmlContent);
			this.overlays = XmlApi.OverlayChannels.extract(xmlContent);
			this.generalState = new XmlApi.GeneralState(xmlContent);
			this.external = this.generalState.externalOutput(xmlContent);
			this.stream = this.generalState.streaming(xmlContent);
			this.active = XmlApi.Inputs.extractProgramInputNumber(xmlContent);
			this.preview = XmlApi.Inputs.extractPreviewInputNumber(xmlContent);
			this.inputs.forEach((input) => {
				let i = this.inputList.findIndex(({ number }) => number == input.number.toString());
				if (i > -1) {
					this.inputList[i].that.initializeDialState(this.inputList[i].action, this.inputList[i].settings);
				}

				i = this.transitionList.findIndex(({ number }) => number == input.number.toString());
				if (i > -1) {
					this.transitionList[i].that.initializeState(this.transitionList[i].action, this.transitionList[i].settings);
				}

				i = this.pictureList.findIndex(({ number }) => number == input.number.toString());
				if (i > -1) {
					this.pictureList[i].that.initializeState(this.pictureList[i].action, this.pictureList[i].settings);
				}
			});
			this.masterList.forEach((master) => {
				master.that.initializeDialState(master.action, master.settings);
			});
			this.externalList.forEach((external) => {
				external.that.initializeState(external.action, external.settings);
			});
			this.streamList.forEach((stream) => {
				stream.that.initializeState(stream.action, stream.settings);
			});
		});

		this.connection.on("connect", () => {
			this.connected = true;
			this.connection.send("XML");
			//this.connection.send("SUBSCRIBE TALLY");
		});
	}

	async refresh(that: vMix) {
		if (that.connected) {
			that.connection.send("XML");
		}
		if ((that.inputList === undefined || that.inputList.length == 0) && (this.masterList === undefined || that.masterList.length == 0)) {
			return;
		}
		setTimeout(() => {
			this.refresh(this);
		}, 100);
	}

	public isConnected(): boolean {
		return this.connected;
	}

	public static get Instance(): vMix {
		return this._instance || (this._instance = new this());
	}

	async getOnAir(input: number): Promise<boolean> {
		while (!this.isConnected()) {
			await new Promise((f) => setTimeout(f, 5000));
		}
		return this.active == input ? true : false;
	}

	async getPreview(input: number): Promise<boolean> {
		while (!this.isConnected()) {
			await new Promise((f) => setTimeout(f, 5000));
		}
		return this.preview == input ? true : false;
	}

	async getOverlay(input: number): Promise<boolean> {
		while (!this.isConnected()) {
			await new Promise((f) => setTimeout(f, 5000));
		}
		return this.overlays !== undefined &&
			Object.keys(this.overlays)
				.map(Number)
				.find((key) => this.overlays[key].inputNumber === input) !== undefined
			? true
			: false;
	}

	async getVolume(input: number): Promise<number> {
		while (!this.isConnected()) {
			await new Promise((f) => setTimeout(f, 5000));
		}
		return this.inputs.length != 0 && this.inputs[input - 1] !== undefined ? Math.floor(Math.pow((this.inputs[input - 1] as VideoInput).volume / 100, 0.25) * 100) : 0;
	}

	async getMasterVolume(): Promise<number> {
		while (!this.isConnected()) {
			await new Promise((f) => setTimeout(f, 5000));
		}
		return this.master != null ? Math.floor(Math.pow(this.master.volume / 100, 0.25) * 100) : 0;
	}

	async getMuted(input: number): Promise<boolean> {
		while (!this.isConnected()) {
			await new Promise((f) => setTimeout(f, 5000));
		}
		return this.inputs.length != 0 && this.inputs[input - 1] !== undefined ? (this.inputs[input - 1] as VideoInput).muted : false;
	}

	async getMasterMuted(): Promise<boolean> {
		while (!this.isConnected()) {
			await new Promise((f) => setTimeout(f, 5000));
		}
		return this.master != null ? this.master.muted : false;
	}

	async getExternal(): Promise<boolean> {
		while (!this.isConnected()) {
			await new Promise((f) => setTimeout(f, 5000));
		}
		return this.external != null ? this.external : false;
	}

	async getStream(): Promise<boolean> {
		while (!this.isConnected()) {
			await new Promise((f) => setTimeout(f, 5000));
		}
		return this.stream != null ? this.stream : false;
	}

	async getSent(input: number): Promise<boolean> {
		while (!this.isConnected()) {
			await new Promise((f) => setTimeout(f, 5000));
		}
		return this.inputs.length != 0 && this.inputs[input - 1] !== undefined && (this.inputs[input - 1] as VideoInput).audiobusses.indexOf("M") > -1 ? true : false;
	}

	async movetoPicture(input: string, next: boolean): Promise<void> {
		this.connection.send({
			Function: (next ? "Next" : "Previous") + "Picture",
			Input: input
		});
	}

	async setVolume(input: string, volume: number): Promise<void> {
		this.connection.send({
			Function: "SetVolume",
			Input: input,
			Value: volume
		});
	}

	async setMasterVolume(volume: number): Promise<void> {
		this.connection.send({
			Function: "SetMasterVolume",
			Value: volume
		});
	}

	async setExternal(active: boolean): Promise<void> {
		this.connection.send({
			Function: (active ? "Start" : "Stop") + "External"
		});
	}

	async setStream(active: boolean): Promise<void> {
		this.connection.send({
			Function: (active ? "Start" : "Stop") + "Streaming"
		});
	}

	async toggleAudio(input: string, muted: boolean): Promise<void> {
		this.connection.send({
			Function: "Audio" + (muted ? "Off" : "On"),
			Input: input
		});
	}

	async setPreview(input: string): Promise<void> {
		this.connection.send({
			Function: "PreviewInput",
			Input: input
		});
	}

	async setActive(input: string, type: string): Promise<void> {
		this.connection.send({
			Function: type,
			Input: input
		});
	}

	async toggleOverlay(input: string, active: boolean, overlay: string): Promise<void> {
		this.connection.send({
			Function: overlay,
			Input: input
		});
	}

	async toggleMasterAudio(muted: boolean): Promise<void> {
		this.connection.send({
			Function: "MasterAudio" + (muted ? "Off" : "On")
		});
	}

	async toggleAudioBus(input: string, sent: boolean): Promise<void> {
		this.connection.send({
			Function: "AudioBus" + (sent ? "On" : "Off"),
			Input: input,
			Value: "M"
		});
	}

	async registerMaster(ac: ActionContext, that: any, settings: any) {
		if (ac === undefined) return;
		if (this.masterList.find(({ action }) => action.id === ac.id) === undefined) {
			this.masterList.push({
				action: ac,
				that: that,
				settings: settings
			});
			setTimeout(() => {
				this.refresh(this);
			}, 100);
		}
	}

	async unregisterMaster(ac: ActionContext) {
		if (ac === undefined) return;
		if (this.masterList.find(({ action }) => action.id === ac.id) !== undefined) {
			this.masterList.splice(
				this.masterList.findIndex(({ action }) => action.id === ac.id),
				1
			);
		}
	}

	async registerStream(ac: ActionContext, that: any, settings: any) {
		if (ac === undefined) return;
		if (this.streamList.find(({ action }) => action.id === ac.id) === undefined) {
			this.streamList.push({
				action: ac,
				that: that,
				settings: settings
			});
			setTimeout(() => {
				this.refresh(this);
			}, 100);
		}
	}

	async unregisterStream(ac: ActionContext) {
		if (ac === undefined) return;
		if (this.streamList.find(({ action }) => action.id === ac.id) !== undefined) {
			this.streamList.splice(
				this.streamList.findIndex(({ action }) => action.id === ac.id),
				1
			);
		}
	}

	async registerExternal(ac: ActionContext, that: any, settings: any) {
		if (ac === undefined) return;
		if (this.externalList.find(({ action }) => action.id === ac.id) === undefined) {
			this.externalList.push({
				action: ac,
				that: that,
				settings: settings
			});
			setTimeout(() => {
				this.refresh(this);
			}, 100);
		}
	}

	async unregisterExternal(ac: ActionContext) {
		if (ac === undefined) return;
		if (this.externalList.find(({ action }) => action.id === ac.id) !== undefined) {
			this.externalList.splice(
				this.externalList.findIndex(({ action }) => action.id === ac.id),
				1
			);
		}
	}

	async registerPicture(input: string, ac: ActionContext, that: any, settings: any) {
		if (ac === undefined) return;
		if (this.pictureList.find(({ action }) => action.id === ac.id) === undefined) {
			this.pictureList.push({
				number: input,
				action: ac,
				that: that,
				settings: settings
			});
			setTimeout(() => {
				this.refresh(this);
			}, 100);
		}
	}

	async unregisterPicture(ac: ActionContext) {
		if (ac === undefined) return;
		if (this.pictureList.find(({ action }) => action.id === ac.id) !== undefined) {
			this.pictureList.splice(
				this.pictureList.findIndex(({ action }) => action.id === ac.id),
				1
			);
		}
	}

	async registerTransition(input: string, ac: ActionContext, that: any, settings: any) {
		if (ac === undefined) return;
		if (this.transitionList.find(({ action }) => action.id === ac.id) === undefined) {
			this.transitionList.push({
				number: input,
				action: ac,
				that: that,
				settings: settings
			});
			setTimeout(() => {
				this.refresh(this);
			}, 100);
		}
	}

	async unregisterTransition(ac: ActionContext) {
		if (ac === undefined) return;
		if (this.transitionList.find(({ action }) => action.id === ac.id) !== undefined) {
			this.transitionList.splice(
				this.transitionList.findIndex(({ action }) => action.id === ac.id),
				1
			);
		}
	}

	async registerInputVolume(input: string, ac: ActionContext, that: any, settings: any) {
		if (ac === undefined) return;
		if (this.inputList.find(({ action }) => action.id === ac.id) === undefined) {
			this.inputList.push({
				number: input,
				action: ac,
				that: that,
				settings: settings
			});
			setTimeout(() => {
				this.refresh(this);
			}, 100);
		}
	}

	async unregisterInputVolume(ac: ActionContext) {
		if (ac === undefined) return;
		if (this.inputList.find(({ action }) => action.id === ac.id) !== undefined) {
			this.inputList.splice(
				this.inputList.findIndex(({ action }) => action.id === ac.id),
				1
			);
		}
	}
}

export const vMixInstance = vMix.Instance;
