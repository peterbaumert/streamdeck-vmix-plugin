import streamDeck, { LogLevel } from "@elgato/streamdeck";

import { InputVolume } from "./actions/inputvolume";
import { MasterVolume } from "./actions/mastervolume";
import { Transition } from "./actions/transition";
import { vMixInstance } from "./vmix/vmix";
import { GlobalSettings } from "../types/settings";
import { External } from "./actions/external";

streamDeck.logger.setLevel(LogLevel.DEBUG);
streamDeck.actions.registerAction(new InputVolume());
streamDeck.actions.registerAction(new MasterVolume());
streamDeck.actions.registerAction(new Transition());
streamDeck.actions.registerAction(new External());
streamDeck.connect();

let globalSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();

if (Object.keys(globalSettings).length === 0) {
    globalSettings = {
        endpoint: "127.0.0.1",
    };
    await streamDeck.settings.setGlobalSettings<GlobalSettings>(globalSettings);
}

export const vm = vMixInstance;
await vMixInstance.setup();