import streamDeck, {
	Action,
	action,
	SingletonAction,
	WillAppearEvent,
	WillDisappearEvent,
	KeyDownEvent,
} from "@elgato/streamdeck";
import { vMixInstance } from "../vmix/vmix";
import { ExternalState } from "../../types/states";
import { ExternalSettings } from "../../types/settings";

@action({ UUID: "io.baumert.vmix.external" })
export class External extends SingletonAction<ExternalSettings> {
	private externals: { [key: string]: ExternalState } = {};

	async onWillAppear(ev: WillAppearEvent<ExternalSettings>): Promise<void> {
		await this.initializeState(ev.action, ev.payload.settings, true);
		await vMixInstance.registerExternal(ev.action, this, ev.payload.settings);
	}

	async onWillDisappear(ev: WillDisappearEvent<ExternalSettings>): Promise<void> {
		await vMixInstance.unregisterExternal(ev.action);
	}

	async onKeyDown(ev: KeyDownEvent<ExternalSettings>): Promise<void> {
		const state = this.getExternalState(ev.action.id);
		if (state.disabled) {
			return;
		}

		const active = !state.active;
		state.active = active;
		await vMixInstance.setExternal(active);

		this.setExternalState(ev.action.id, state);
		let type = state.active ? "_active" : "";
		await ev.action.setImage("imgs/actions/external/key" + type);
	}

	async initializeState(action: Action<ExternalSettings>, settings: ExternalSettings, override: boolean = false) {
		let changed = false;
		const state = this.getExternalState(action.id);
		let active: boolean;
		let type: string = "";

		try {
			active = await vMixInstance.getExternal();
		} catch (e) {
			streamDeck.logger.error("Error: " + e);
			action.showAlert();
			state.disabled = true;
			this.setExternalState(action.id, state);
			await action.setTitle("Error");
			return;
		}

		if (state.active != active) {
			state.active = active;
			changed = true;
		}
		if (state.disabled != false) {
			state.disabled = false;
			changed = true;
		}
		type = active ? "_active" : "";
		if (changed || override) {
			this.setExternalState(action.id, state);
			await action.setTitle(settings.title);
			await action.setImage("imgs/actions/external/key" + type);
		}
	}

	getExternalState(id: string): ExternalState {
		const state = this.externals[id];
		if (state == null) {
			const defaultState = {
				active: false,
			};

			this.externals[id] = defaultState;
			return defaultState;
		}

		return state;
	}

	setExternalState(id: string, state: ExternalState) {
		this.externals[id] = state;
	}
}
