import streamDeck, { Action, action, DidReceiveSettingsEvent, JsonObject, KeyDownEvent, SendToPluginEvent, SingletonAction, WillAppearEvent, WillDisappearEvent } from "@elgato/streamdeck";

import { InputsPayload } from "../../types/payloads";
import { PictureSettings } from "../../types/settings";
import { PictureState } from "../../types/states";
import { vMixInstance } from "../vmix/vmix";

@action({ UUID: "io.baumert.vmix.picture" })
export class Picture extends SingletonAction<PictureSettings> {
	private pictures: { [key: string]: PictureState } = {};

	async onWillAppear(ev: WillAppearEvent<PictureSettings>): Promise<void> {
		await this.initializeState(ev.action, ev.payload.settings, true);
		await vMixInstance.registerPicture(ev.payload.settings.input, ev.action, this, ev.payload.settings);
	}

	async onWillDisappear(ev: WillDisappearEvent<PictureSettings>): Promise<void> {
		await vMixInstance.unregisterPicture(ev.action);
	}

	async onDidReceiveSettings(ev: DidReceiveSettingsEvent<PictureSettings>): Promise<void> {
		await this.initializeState(ev.action, ev.payload.settings, true);
		await vMixInstance.unregisterPicture(ev.action);
		await vMixInstance.registerPicture(ev.payload.settings.input, ev.action, this, ev.payload.settings);
	}

	async onKeyDown(ev: KeyDownEvent<PictureSettings>): Promise<void> {
		const state = this.getPictureState(ev.action.id);
		if (state.disabled) {
			return;
		}

		await vMixInstance.movetoPicture(ev.payload.settings.input, ev.payload.settings.next);

		this.setPictureState(ev.action.id, state);
		let type = state.active ? "_active" : state.overlay ? "_overlay" : state.preview ? "_preview" : "";
		type += ev.payload.settings.next ? "_next" : "_prev";
		await ev.action.setImage("imgs/actions/picture/key" + type);
	}

	async initializeState(action: Action<PictureSettings>, settings: PictureSettings, override: boolean = false) {
		let changed = false;
		const state = this.getPictureState(action.id);
		let active: boolean;
		let preview: boolean;
		let overlay: boolean;
		let type: string = "";

		try {
			active = await vMixInstance.getOnAir(parseInt(settings.input));
			preview = await vMixInstance.getPreview(parseInt(settings.input));
			overlay = await vMixInstance.getOverlay(parseInt(settings.input));
		} catch (e) {
			streamDeck.logger.error("Error: " + e);
			action.showAlert();
			state.disabled = true;
			this.setPictureState(action.id, state);
			if (action.isKey()) {
				await action.setTitle("Error");
			}
			return;
		}

		if (state.preview != preview) {
			state.preview = preview;
			changed = true;
		}
		if (state.overlay != overlay) {
			state.overlay = overlay;
			changed = true;
		}
		if (state.active != active) {
			state.active = active;
			changed = true;
		}
		if (state.disabled != false) {
			state.disabled = false;
			changed = true;
		}
		type = state.active ? "_active" : state.overlay ? "_overlay" : state.preview ? "_preview" : "";
		type += settings.next ? "_next" : "_prev";
		if ((changed || override) && action.isKey()) {
			this.setPictureState(action.id, state);
			await action.setTitle(settings.title);
			await action.setImage("imgs/actions/picture/key" + type);
		}
	}

	getPictureState(id: string): PictureState {
		const state = this.pictures[id];
		if (state == null) {
			const defaultState = {
				active: false,
				preview: false,
				overlay: false
			};

			this.pictures[id] = defaultState;
			return defaultState;
		}

		return state;
	}

	setPictureState(id: string, state: PictureState) {
		this.pictures[id] = state;
	}

	onSendToPlugin(ev: SendToPluginEvent<InputsPayload, JsonObject>): Promise<void> | void {
		if (ev.payload.event == "getInputs") {
			var inputs = Array();
			for (let i = 0; i < vMixInstance.inputs.length; i++) {
				inputs.push({
					label: vMixInstance.inputs[i].title,
					value: vMixInstance.inputs[i].number
				});
			}
			streamDeck.ui.current?.sendToPropertyInspector({
				event: "getInputs",
				items: inputs
			});
		}
	}
}
