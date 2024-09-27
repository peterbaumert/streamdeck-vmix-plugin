import streamDeck, { Action, action, DialDownEvent, DialRotateEvent, SingletonAction, WillAppearEvent, WillDisappearEvent } from "@elgato/streamdeck";

import { MasterVolumeSettings } from "../../types/settings";
import { MasterVolumeDialState } from "../../types/states";
import { vMixInstance } from "../vmix/vmix";

@action({ UUID: "io.baumert.vmix.mastervolume" })
export class MasterVolume extends SingletonAction<MasterVolumeSettings> {
	private dials: { [key: string]: MasterVolumeDialState } = {};

	async onWillAppear(ev: WillAppearEvent<MasterVolumeSettings>): Promise<void> {
		await this.initializeDialState(ev.action, ev.payload.settings, true);
		await vMixInstance.registerMaster(ev.action, this, ev.payload.settings);
	}

	async onWillDisappear(ev: WillDisappearEvent<MasterVolumeSettings>): Promise<void> {
		await vMixInstance.unregisterMaster(ev.action);
	}

	async onDialRotate(ev: DialRotateEvent<MasterVolumeSettings>): Promise<void> {
		const state = this.getDialState(ev.action.id);

		if (state.disabled || state.muted) {
			return;
		}

		const steps = ev.payload.settings.steps ?? 1;
		const newVolume = clamp(state.volume + ev.payload.ticks * steps, 0, 100);
		state.volume = newVolume;

		this.setDialState(ev.action.id, state);
		await ev.action.setFeedback({
			value: newVolume,
			indicator: newVolume
		});
		await vMixInstance.setMasterVolume(newVolume);
	}

	async onDialDown(ev: DialDownEvent<MasterVolumeSettings>): Promise<void> {
		const state = this.getDialState(ev.action.id);
		if (state.disabled) {
			return;
		}
		const muted = !state.muted;

		state.muted = muted;

		this.setDialState(ev.action.id, state);
		await ev.action.setFeedback({
			icon: muted ? "imgs/actions/volume/speaker-disabled" : "imgs/actions/volume/speaker"
		});
		await vMixInstance.toggleMasterAudio(state.muted);
	}

	async initializeDialState(action: Action<MasterVolumeSettings>, settings: MasterVolumeSettings, override: boolean = false) {
		let changed = false;
		const state = this.getDialState(action.id);
		let volume: number;
		let muted: boolean;
		try {
			volume = await vMixInstance.getMasterVolume();
			muted = await vMixInstance.getMasterMuted();
		} catch (e) {
			streamDeck.logger.error("Error: " + e);
			action.showAlert();
			state.disabled = true;
			this.setDialState(action.id, state);
			await action.setFeedback({
				value: "Error",
				indicator: {
					value: 0
				}
			});
			return;
		}

		if (state.volume != volume) {
			state.volume = volume;
			changed = true;
		}
		if (state.muted != muted) {
			state.muted = muted;
			changed = true;
		}
		if (state.disabled != false) {
			state.disabled = false;
			changed = true;
		}
		if (changed || override) {
			this.setDialState(action.id, state);
			await action.setFeedback({
				name: settings.title,
				value: volume,
				indicator: {
					value: volume
				},
				icon: muted ? "imgs/actions/volume/speaker-disabled" : "imgs/actions/volume/speaker"
			});
			action.showOk();
		}
	}

	getDialState(id: string): MasterVolumeDialState {
		const state = this.dials[id];
		if (state == null) {
			const defaultState = {
				muted: false,
				sent: true,
				volume: 50
			};

			this.dials[id] = defaultState;
			return defaultState;
		}

		return state;
	}

	setDialState(id: string, state: MasterVolumeDialState) {
		this.dials[id] = state;
	}
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}
