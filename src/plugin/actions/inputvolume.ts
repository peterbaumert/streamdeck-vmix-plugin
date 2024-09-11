import streamDeck, {
    Action,
    action,
    DialRotateEvent,
    SendToPluginEvent,
    SingletonAction,
    WillAppearEvent,
    WillDisappearEvent,
    DidReceiveSettingsEvent,
    DialDownEvent,
    TouchTapEvent,
} from "@elgato/streamdeck";
import { vMixInstance } from "../vmix/vmix";
import { InputVolumeSettings } from "../../types/settings";
import { VolumeDialState } from "../../types/states";
import { InputsPayload } from "../../types/payloads";

@action({ UUID: "io.baumert.vmix.inputvolume" })
export class InputVolume extends SingletonAction<InputVolumeSettings> {
    private dials: { [key: string]: VolumeDialState } = {};

    async onWillAppear(ev: WillAppearEvent<InputVolumeSettings>): Promise<void> {
        await this.initializeDialState(ev.action, ev.payload.settings, true);
        await vMixInstance
            .registerInputVolume(
                ev.payload.settings.input,
                ev.action,
                this,
                ev.payload.settings
            );
    }

    async onWillDisappear(ev: WillDisappearEvent<InputVolumeSettings>): Promise<void> {
        await vMixInstance.unregisterInputVolume(ev.action);
    }

    async onDidReceiveSettings(
        ev: DidReceiveSettingsEvent<InputVolumeSettings>
    ): Promise<void> {
        await this.initializeDialState(ev.action, ev.payload.settings);
        await vMixInstance.unregisterInputVolume(ev.action);
        await vMixInstance
            .registerInputVolume(
                ev.payload.settings.input,
                ev.action,
                this,
                ev.payload.settings
            );
    }

    async onDialRotate(ev: DialRotateEvent<InputVolumeSettings>): Promise<void> {
        const state = this.getDialState(ev.action.id);

        if (state.disabled || state.muted || !state.sent) {
            return;
        }

        const steps = ev.payload.settings.steps ?? 1;
        const newVolume = clamp(state.volume + ev.payload.ticks * steps, 0, 100);
        state.volume = newVolume;

        this.setDialState(ev.action.id, state);
        await ev.action.setFeedback({
            value: newVolume,
            indicator: newVolume,
        });
        await vMixInstance.setVolume(ev.payload.settings.input, newVolume);
    }

    async onDialDown(ev: DialDownEvent<InputVolumeSettings>): Promise<void> {
        const state = this.getDialState(ev.action.id);
        if (state.disabled) {
            return;
        }
        const muted = !state.muted;

        state.muted = muted;

        this.setDialState(ev.action.id, state);
        await ev.action.setFeedback({
            icon: muted
                ? "imgs/actions/volume/speaker-disabled"
                : "imgs/actions/volume/speaker",
        });
        await vMixInstance
            .toggleAudio(ev.payload.settings.input, state.muted);
    }

    async onTouchTap(ev: TouchTapEvent<InputVolumeSettings>): Promise<void> {
        const state = this.getDialState(ev.action.id);
        if (state.disabled) {
            return;
        }

        const sent = !state.sent;
        state.sent = sent;

        this.setDialState(ev.action.id, state);
        await vMixInstance
            .toggleAudioBus(ev.payload.settings.input, state.sent);
        await ev.action.setFeedbackLayout(
            "json/layouts/" + (sent ? "green" : "red") + ".json"
        );
        await ev.action.setFeedback({
            name: ev.payload.settings.title,
            value: state.volume,
            indicator: {
                value: state.volume,
            },
        });
    }

    async initializeDialState(
        action: Action<InputVolumeSettings>,
        settings: InputVolumeSettings,
        override: boolean = false
    ) {
        let changed = false;
        const state = this.getDialState(action.id);
        let volume: number;
        let muted: boolean;
        let sent: boolean;
        try {
            volume = await vMixInstance.getVolume(parseInt(settings.input));
            muted = await vMixInstance.getMuted(parseInt(settings.input));
            sent = await vMixInstance.getSent(parseInt(settings.input));
        } catch (e) {
            streamDeck.logger.error("Error: " + e);
            action.showAlert();
            state.disabled = true;
            this.setDialState(action.id, state);
            await action.setFeedback({
                value: "Error",
                indicator: {
                    value: 0,
                },
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
        if (state.sent != sent) {
            state.sent = sent;
            changed = true;
        }
        if (state.disabled != false) {
            state.disabled = false;
            changed = true;
        }
        if (changed || override) {
            this.setDialState(action.id, state);
            await action.setFeedbackLayout(
                "json/layouts/" + (sent ? "green" : "red") + ".json"
            );
            await action.setFeedback({
                name: settings.title,
                value: volume,
                indicator: {
                    value: volume,
                },
                icon: muted
                    ? "imgs/actions/volume/speaker-disabled"
                    : "imgs/actions/volume/speaker",
            });
            action.showOk();
        }
    }

    getDialState(id: string): VolumeDialState {
        const state = this.dials[id];
        if (state == null) {
            const defaultState = {
                muted: false,
                sent: true,
                volume: 50,
            };

            this.dials[id] = defaultState;
            return defaultState;
        }

        return state;
    }

    setDialState(id: string, state: VolumeDialState) {
        this.dials[id] = state;
    }

    onSendToPlugin(
        ev: SendToPluginEvent<InputsPayload, object>
    ): Promise<void> | void {
        if (ev.payload.event == "getInputs") {
            var inputs = Array();
            for (let i = 0; i < vMixInstance.inputs.length; i++) {
                inputs.push({
                    label: vMixInstance.inputs[i].title,
                    value: vMixInstance.inputs[i].number,
                });
            }
            ev.action.sendToPropertyInspector({
                event: "getInputs",
                items: inputs,
            });
        }
    }
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}
