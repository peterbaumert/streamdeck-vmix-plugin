import streamDeck, {
    Action,
    action,
    SendToPluginEvent,
    SingletonAction,
    WillAppearEvent,
    WillDisappearEvent,
    DidReceiveSettingsEvent,
    KeyDownEvent,
} from "@elgato/streamdeck";
import { vMixInstance } from "../vmix/vmix";
import { TransitionSettings } from "../../types/settings";
import { TransitionState } from "../../types/states";
import { InputsPayload } from "../../types/payloads";
import { OVERLAY, TRANSITIONTYPE } from "../../constants";

@action({ UUID: "io.baumert.vmix.transition" })
export class Transition extends SingletonAction<TransitionSettings> {
    private transitions: { [key: string]: TransitionState } = {};

    async onWillAppear(ev: WillAppearEvent<TransitionSettings>): Promise<void> {
        await this.initializeState(ev.action, ev.payload.settings, true);
        await vMixInstance
            .registerTransition(
                ev.payload.settings.input,
                ev.action,
                this,
                ev.payload.settings
            );
    }

    async onWillDisappear(ev: WillDisappearEvent<TransitionSettings>): Promise<void> {
        await vMixInstance.unregisterTransition(ev.action);
    }

    async onDidReceiveSettings(
        ev: DidReceiveSettingsEvent<TransitionSettings>
    ): Promise<void> {
        await this.initializeState(ev.action, ev.payload.settings);
        await vMixInstance.unregisterTransition(ev.action);
        await vMixInstance
            .registerTransition(
                ev.payload.settings.input,
                ev.action,
                this,
                ev.payload.settings
            );
    }

    async onKeyDown(ev: KeyDownEvent<TransitionSettings>): Promise<void> {
        const state = this.getTransitionState(ev.action.id);
        if (state.disabled) {
            return;
        }

        switch (ev.payload.settings.transition) {
            case TRANSITIONTYPE.OVERLAY:
                const overlay = !state.overlay;
                state.overlay = overlay;
                await vMixInstance.toggleOverlay(ev.payload.settings.input, state.overlay, ev.payload.settings.overlay);
                break;
            case TRANSITIONTYPE.TRANSITION1 || TRANSITIONTYPE.TRANSITION2 || TRANSITIONTYPE.TRANSITION3 || TRANSITIONTYPE.TRANSITION4:
                await vMixInstance.setPreview(ev.payload.settings.input);
            default:
                const active = true;
                state.active = active;
                await vMixInstance.setActive(ev.payload.settings.input, ev.payload.settings.transition);
                break;
        }

        this.setTransitionState(ev.action.id, state);
        let type = state.active ? "_active" : (state.overlay ? "_overlay" : (state.preview ? "_preview" : ""));
        await ev.action.setImage("imgs/actions/transition/key" + type)
    }

    async initializeState(
        action: Action<TransitionSettings>,
        settings: TransitionSettings,
        override: boolean = false
    ) {
        let changed = false;
        const state = this.getTransitionState(action.id);
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
            this.setTransitionState(action.id, state);
            await action.setTitle("Error");
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
        type = active ? "_active" : (overlay ? "_overlay" : (preview ? "_preview" : ""));
        if (changed || override) {
            this.setTransitionState(action.id, state);
            await action.setTitle(settings.title);
            await action.setImage("imgs/actions/transition/key" + type)
        }
    }

    getTransitionState(id: string): TransitionState {
        const state = this.transitions[id];
        if (state == null) {
            const defaultState = {
                active: false,
                preview: false,
                overlay: false
            };

            this.transitions[id] = defaultState;
            return defaultState;
        }

        return state;
    }

    setTransitionState(id: string, state: TransitionState) {
        this.transitions[id] = state;
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
        if (ev.payload.event == "getTransitions") {
            var transitions = Object.entries(TRANSITIONTYPE).map(([value, label]) => ({ value: label, label: label }));
            ev.action.sendToPropertyInspector({
                event: "getTransitions",
                items: transitions,
            });
        }
        if (ev.payload.event == "getOverlays") {
            var overlays = Object.entries(OVERLAY).map(([value, label]) => ({ value: label, label: label }));
            ev.action.sendToPropertyInspector({
                event: "getOverlays",
                items: overlays,
            });
        }
    }
}