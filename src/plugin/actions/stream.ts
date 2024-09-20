import streamDeck, {
    Action,
    action,
    SingletonAction,
    WillAppearEvent,
    WillDisappearEvent,
    KeyDownEvent,
} from "@elgato/streamdeck";
import { vMixInstance } from "../vmix/vmix";
import { StreamState } from "../../types/states";
import { StreamSettings } from "../../types/settings";

@action({ UUID: "io.baumert.vmix.stream" })
export class Stream extends SingletonAction<StreamSettings> {
    private streams: { [key: string]: StreamState } = {};

    async onWillAppear(ev: WillAppearEvent<StreamSettings>): Promise<void> {
        await this.initializeState(ev.action, ev.payload.settings, true);
        await vMixInstance
            .registerStream(
                ev.action,
                this,
                ev.payload.settings
            );
    }

    async onWillDisappear(ev: WillDisappearEvent<StreamSettings>): Promise<void> {
        await vMixInstance.unregisterStream(ev.action);
    }

    async onKeyDown(ev: KeyDownEvent<StreamSettings>): Promise<void> {
        const state = this.getStreamState(ev.action.id);
        if (state.disabled) {
            return;
        }


        const active = !state.active;
        state.active = active;
        await vMixInstance.setStream(active);


        this.setStreamState(ev.action.id, state);
        let type = state.active ? "_active" : "";
        await ev.action.setImage("imgs/actions/stream/key" + type)
    }

    async initializeState(
        action: Action<StreamSettings>,
        settings: StreamSettings,
        override: boolean = false
    ) {
        let changed = false;
        const state = this.getStreamState(action.id);
        let active: boolean;
        let type: string = "";

        try {
            active = await vMixInstance.getStream();
        } catch (e) {
            streamDeck.logger.error("Error: " + e);
            action.showAlert();
            state.disabled = true;
            this.setStreamState(action.id, state);
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
            this.setStreamState(action.id, state);
            await action.setTitle(settings.title);
            await action.setImage("imgs/actions/stream/key" + type)
        }
    }

    getStreamState(id: string): StreamState {
        const state = this.streams[id];
        if (state == null) {
            const defaultState = {
                active: false,
            };

            this.streams[id] = defaultState;
            return defaultState;
        }

        return state;
    }

    setStreamState(id: string, state: StreamState) {
        this.streams[id] = state;
    }
}