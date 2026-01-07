import { ClientReadableStream } from "@grpc/grpc-js";
import { CueClientClient } from "../../generated/Client/CueClient";
import { CueChangedMessage, SetCueEntryValueRequest, SetCueEntryValueRequest_EClearValue, SetCueValueRequest } from "../../generated/Common/Types/Cue/CueServiceTypes";
import { TriggerValueData } from "../../generated/Common/Types/Cue/CueTriggerServiceTypes";
import { FannedPropertyValue } from "../../generated/Common/Types/Device/DeviceServiceTypes";
import { EViewMode, GroupState } from "../../generated/Common/Types/ProgrammerServiceTypes";
import { BaseClient } from "../baseClient";
import { gracefulStopReadableStream, translateToString } from "../helpers/request";
import { ClientStore } from "../store";

export class CueClient extends BaseClient {
    private client: CueClientClient;
    private cueChangeStream: ClientReadableStream<CueChangedMessage> | undefined;

    constructor(store: ClientStore) {
        super(store);
        this.client = new CueClientClient(store.connectionString!, store.credentials!);
    }

    private async setCueValue(cueId: string, parentId: string, request: Partial<SetCueValueRequest>): Promise<void> {
        return new Promise((resolve, reject) => {
            this.client.setCueValue({
                requestId: this.store.createRequestId(),
                cueId: cueId,
                parentContainerId: parentId,
                ...request
            }, this.store.getMetadata(), (err, response) => {
                if (err) {
                    return reject(err);
                }
                console.log(response)
                if (!response.ok) {
                    return reject(new Error(translateToString(response.message) || "Failed to set cue value"));
                }
                resolve();
            });
        });
    }

    public async renameCue(cueId: string, parentId: string, newName: string) {
        return this.setCueValue(cueId, parentId, { name: newName });
    }

    public async enableCue(cueId: string, parentId: string) {
        return this.setCueValue(cueId, parentId, { enabled: true });
    }

    public async disableCue(cueId: string, parentId: string) {
        return this.setCueValue(cueId, parentId, { enabled: false });
    }

    public async enableAutoprepare(cueId: string, parentId: string) {
        return this.setCueValue(cueId, parentId, { autoprepareEnabled: true });
    }

    public async disableAutoprepare(cueId: string, parentId: string) {
        return this.setCueValue(cueId, parentId, { autoprepareEnabled: false });
    }

    public async setTrigger(cueId: string, parentId: string, trigger: TriggerValueData) {
        return this.setCueValue(cueId, parentId, { triggerValue: trigger });
    }

    public async setCueComment(cueId: string, parentId: string, comment: string) {
        return this.setCueValue(cueId, parentId, { comment });
    }

    public async setCueNumber(cueId: string, parentId: string, number: number[]) {
        return this.setCueValue(cueId, parentId, { cueNumber: { number } });
    }

    public async setDelay(cueId: string, parentId: string, delay: FannedPropertyValue) {
        return this.setCueValue(cueId, parentId, { delay: delay });
    }

    public async setDelayDown(cueId: string, parentId: string, delayDown: FannedPropertyValue) {
        return this.setCueValue(cueId, parentId, { delayDown: delayDown });
    }

    public async setFade(cueId: string, parentId: string, fade: FannedPropertyValue) {
        return this.setCueValue(cueId, parentId, { fade: fade });
    }

    public async setFadeDown(cueId: string, parentId: string, fadeDown: FannedPropertyValue) {
        return this.setCueValue(cueId, parentId, { fadeDown: fadeDown });
    }

    public async enableTakeFades(cueId: string, parentId: string) {
        return this.setCueValue(cueId, parentId, { takeFades: true });
    }

    public async disableTakeFades(cueId: string, parentId: string) {
        return this.setCueValue(cueId, parentId, { takeFades: false });
    }

    private async setCueEntryValue(parentEntryId: string, parentId: string, cueEntryId: string, request: Partial<SetCueEntryValueRequest>): Promise<void> {
        return new Promise((resolve, reject) => {
            this.client.setCueEntryValue({
                requestId: this.store.createRequestId(),
                parentEntryContainerId: parentEntryId,
                parentParentContainerId: parentId,
                cueEntryId: cueEntryId,
                ...request
            }, this.store.getMetadata(), (err, response) => {
                console.log(response);
                if (err) {
                    return reject(err);
                }
                if (!response.ok) {
                    return reject(new Error(translateToString(response.message) || "Failed to set cue entry value"));
                }
                resolve();
            });
        });
    }

    public async setCueEntryDelay(cueEntryId: string, parentId: string, parentEntryId: string, delay: FannedPropertyValue) {
        return this.setCueEntryValue(parentEntryId, parentId, cueEntryId, { delay: delay });
    }

    public async clearCueEntryDelay(cueEntryId: string, parentId: string, parentEntryId: string) {
        return this.setCueEntryValue(parentEntryId, parentId, cueEntryId, { clear: SetCueEntryValueRequest_EClearValue.Delay });
    }

    public async setCueEntryDeviceDelay(cueEntryId: string, parentId: string, parentEntryId: string, deviceId: string, delay: number) {
        return this.setCueEntryValue(parentEntryId, parentId, cueEntryId, { deviceDelay: { deviceId, value: delay.toString(), valueSet: true } });
    }

    public async clearCueEntryDeviceDelay(cueEntryId: string, parentId: string, parentEntryId: string, deviceId: string) {
        return this.setCueEntryValue(parentEntryId, parentId, cueEntryId, { clear: SetCueEntryValueRequest_EClearValue.DeviceDelay });
    }

    public async setCueEntryFade(cueEntryId: string, parentId: string, parentEntryId: string, fade: FannedPropertyValue) {
        return this.setCueEntryValue(parentEntryId, parentId, cueEntryId, { fade: fade });
    }

    public async clearCueEntryFade(cueEntryId: string, parentId: string, parentEntryId: string) {
        return this.setCueEntryValue(parentEntryId, parentId, cueEntryId, { clear: SetCueEntryValueRequest_EClearValue.Fade });
    }

    public async setCueEntryDeviceFade(cueEntryId: string, parentId: string, parentEntryId: string, deviceId: string, fade: number) {
        return this.setCueEntryValue(parentEntryId, parentId, cueEntryId, { deviceFade: { deviceId, value: fade.toString(), valueSet: true } });
    }

    public async clearCueEntryDeviceFade(cueEntryId: string, parentId: string, parentEntryId: string, deviceId: string) {
        return this.setCueEntryValue(parentEntryId, parentId, cueEntryId, { clear: SetCueEntryValueRequest_EClearValue.DeviceFade });
    }

    public async getCueStates(cueId: string, parentId: string, mode: EViewMode): Promise<GroupState[]> {
        return new Promise((resolve, reject) => {
            this.client.getCueStates({
                requestId: this.store.createRequestId(),
                cueId,
                parentContainerId: parentId,
                mode: mode
            }, this.store.getMetadata(), (err, response) => {
                if (err) {
                    return reject(err);
                }
                if (response.notFound) {
                    return reject(new Error("Cue not found"));
                }
                resolve(response.states);
            });
        });
    }

    public async deleteCue(cueId: string, parentId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.client.deleteCue({
                requestId: this.store.createRequestId(),
                cueId,
                parentContainerId: parentId
            }, this.store.getMetadata(), (err, response) => {
                if (err) {
                    return reject(err);
                }
                console.log(response)
                if (!response.ok) {
                    return reject(new Error(translateToString(response.message) || "Failed to delete cue"));
                }
                resolve();
            });
        });
    }

    public async moveCue(cueId: string, parentId: string, targetIndex: number): Promise<void> {
        return new Promise((resolve, reject) => {
            this.client.moveCue({
                requestId: this.store.createRequestId(),
                cueId,
                parentContainerId: parentId,
                targetIndex
            }, this.store.getMetadata(), (err, response) => {
                if (err) {
                    return reject(err);
                }
                console.log(response)
                if (!response.ok) {
                    return reject(new Error(translateToString(response.message) || "Failed to move cue"));
                }
                resolve();
            });
        });
    }

    public async copyCue(cueId: string, parentId: string, targetParentId: string, targetIndex: number, newName: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.client.copyCue({
                requestId: this.store.createRequestId(),
                cueId,
                parentContainerId: parentId,
                targetParentContainerId: targetParentId,
                targetIndex,
                copyNameTemplate: newName,
            }, this.store.getMetadata(), (err, response) => {
                if (err) {
                    return reject(err);
                }
                console.log(response)
                if (!response.ok) {
                    return reject(new Error(translateToString(response.message) || "Failed to copy cue"));
                }
                resolve();
            });
        });
    }

    public receiveCueChanges(): ClientReadableStream<CueChangedMessage> {
        if (!this.cueChangeStream) {
            this.cueChangeStream = this.client.receiveCueChanges({ requestId: this.store.createRequestId() }, this.store.getMetadata());
        }
        return this.cueChangeStream;
    }

    public async close(): Promise<void> {
        await gracefulStopReadableStream(this.cueChangeStream);
        this.client.close();
    }
}