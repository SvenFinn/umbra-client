import { ClientReadableStream } from "@grpc/grpc-js";
import { AttachableClientClient } from "../../generated/Client/AttachableClient";
import { AttachableChangeMessage, AttachableParameterBag, CanAttachAttachableToRequest, EffectVisualizationData, EffectVisualizationVector, ModifyAttachablePresetRequest, ModifyAttachablePresetRequest_EModType } from "../../generated/Common/Types/AttachableServiceTypes";
import { ObjectData } from "../../generated/Common/Types/CommonTypes";
import { AttachableData } from "../../generated/Common/Types/Device/DeviceServiceTypes";
import { BaseClient } from "../baseClient";
import { gracefulStopReadableStream, translateToString } from "../helpers/request";
import { ClientStore } from "../store";

//TODO: TESTING

export class AttachableClient extends BaseClient {
    private client: AttachableClientClient;
    private changeStream: ClientReadableStream<AttachableChangeMessage> | undefined;
    constructor(store: ClientStore) {
        super(store);
        this.client = new AttachableClientClient(store.connectionString!, store.credentials!);
    }

    /**
     * Retrieves the list of available attachable objects for the current user context.
     *
     * @returns A Promise that resolves with an array of attachable objects.
     *
     * @throws {Error} If no user context is set or if the RPC call fails.
     */
    public async getAttachables(): Promise<AttachableData[]> {
        if (!this.store.userContextId) {
            throw new Error("User context not set, cannot get attachables");
        }
        return new Promise((resolve, reject) => {
            // idFilter is a required field but results in an empty response populated
            // DMXC-3.3.1
            this.client.getAttachables({ idFilter: [], requestId: this.store.createRequestId(), userContextId: this.store.userContextId! }, this.store.getMetadata(), (err, response) => {
                if (err) {
                    return reject(err);
                }
                resolve(response.attachables);
            });
        });
    }

    /**
     * Retrieves a specific attachable object by its ID.
     *
     * @param attachableId - The unique identifier of the attachable to retrieve.
     * @returns A Promise that resolves with the matching `AttachableData` if found, or `undefined` otherwise.
     *
     * @throws {Error} If no user context is set or if retrieving attachables fails.
     */
    public async getAttachableById(attachableId: string): Promise<AttachableData | undefined> {
        const attachables = await this.getAttachables();
        return attachables.find(a => a.id === attachableId);
    }

    private async canAttachTo(attachableId: string, request: Partial<CanAttachAttachableToRequest>): Promise<string[]> {
        const attachable = await this.getAttachableById(attachableId);
        if (!attachable) {
            throw new Error(`Attachable with ID ${attachableId} not found`);
        }
        return new Promise((resolve, reject) => {
            // ProptertyId seems to get ignored by the server
            // DMXC-3.3.1
            this.client.canAttachTo({ requestId: this.store.createRequestId(), attachable, ...request, propertyId: "" }, this.store.getMetadata(), (err, response) => {
                if (err) {
                    return reject(err);
                }
                resolve(response.propertyIds);
            });
        });
    }

    /**
     * Determines which properties the specified attachable can be linked to on a given device.
     *
     * @param deviceId - The ID of the device to check.
     * @param attachableId - The ID of the attachable object.
     * @returns A Promise that resolves with an array of property IDs on the device that can accept the attachable.
     *
     * @throws {Error} If the attachable cannot be found or if the RPC call fails.
     */
    public async canAttachToDevice(deviceId: string, attachableId: string): Promise<string[]> {
        return this.canAttachTo(attachableId, { deviceId });
    }

    /**
     * Determines which properties the specified attachable can be linked to on a given device group.
     *
     * @param groupId - The ID of the device group to check.
     * @param attachableId - The ID of the attachable object.
     * @returns A Promise that resolves with an array of property IDs on the group that can accept the attachable.
     *
     * @throws {Error} If the attachable cannot be found or if the RPC call fails.
     */
    public async canAttachToGroup(groupId: string, attachableId: string): Promise<string[]> {
        return this.canAttachTo(attachableId, { deviceGroupId: groupId });
    }

    private async modifyAttachablePreset(request: Partial<ModifyAttachablePresetRequest>): Promise<string> {
        return new Promise((resolve, reject) => {
            this.client.modifyAttachablePreset({
                requestId: this.store.createRequestId(),
                bag: undefined,
                type: ModifyAttachablePresetRequest_EModType.UNKNOWN,
                newName: "",
                id: "",
                ...request
            }, this.store.getMetadata(), (err, response) => {
                if (err) {
                    return reject(err);
                }
                if (!response.ok) {
                    return reject(new Error(translateToString(response.message) || "Failed to modify attachable preset"));
                }
                // Does response.id always contain the ID of the modified preset, even for DELETE?
                resolve(response.id);
            });
        });
    }

    public async createAttachablePreset(name: string, parameters: { [key: string]: ObjectData }, sourceAttachableId?: string): Promise<string> {
        const sourceAttachable = sourceAttachableId ? await this.getAttachableById(sourceAttachableId) : undefined;
        return this.modifyAttachablePreset({
            bag: { parameters, source: sourceAttachable },
            newName: name,
            type: ModifyAttachablePresetRequest_EModType.ADD,
            id: ""
        });
    }

    public async renameAttachablePreset(id: string, newName: string): Promise<string> {
        return this.modifyAttachablePreset({
            id,
            newName,
            type: ModifyAttachablePresetRequest_EModType.CHANGE,
            bag: undefined
        });
    }

    public async modifyAttachablePresetParameters(id: string, parameters: { [key: string]: ObjectData }, sourceAttachableId?: string): Promise<string> {
        const sourceAttachable = sourceAttachableId ? await this.getAttachableById(sourceAttachableId) : undefined;
        return this.modifyAttachablePreset({
            id,
            bag: { parameters, source: sourceAttachable },
            newName: "",
            type: ModifyAttachablePresetRequest_EModType.CHANGE
        });
    }

    public async deleteAttachablePreset(id: string): Promise<string> {
        return this.modifyAttachablePreset({
            requestId: this.store.createRequestId(), id, type: ModifyAttachablePresetRequest_EModType.DELETE, newName: "", bag: undefined
        });
    }

    // How does this even work? It does not take any parameters
    // it only returns undefined. 
    public async getAttachablePreset(): Promise<AttachableParameterBag | undefined> {
        return new Promise((resolve, reject) => {
            this.client.getAttachablePreset({ requestId: this.store.createRequestId() }, this.store.getMetadata(), (err, response) => {
                if (err) {
                    return reject(err);
                }
                resolve(response.bag);
            });
        });
    }

    public async getEffectVisualizationForEffect(steps: number, attachableId?: string, parameters?: AttachableParameterBag): Promise<EffectVisualizationData | undefined> {
        const attachable = attachableId ? await this.getAttachableById(attachableId) : undefined;
        return new Promise((resolve, reject) => {
            this.client.getEffectVisualization({
                requestId: this.store.createRequestId(),
                steps,
                newEffect: {
                    meta: attachable,
                    parameters
                }
            }, this.store.getMetadata(), (err, response) => {
                if (err) {
                    return reject(err);
                }
                resolve(response.result);
            });
        });
    }

    public async getEffectVisualizationFromProgrammer(steps: number, groupId: string, propertyId: string, effectId: string): Promise<EffectVisualizationData | undefined> {
        if (!this.store.userContextId) {
            throw new Error("No user context set, cannot get effect visualization from programmer");
        }
        return new Promise((resolve, reject) => {
            this.client.getEffectVisualization({
                requestId: this.store.createRequestId(),
                steps,
                fromProgrammer: {
                    userContextId: this.store.userContextId!,
                    effectId,
                    groupId,
                    propertyId
                }
            }, this.store.getMetadata(), (err, response) => {
                if (err) {
                    return reject(err);
                }
                resolve(response.result);
            });
        });
    }

    public async getEffectVisualizationVectorsFromProgrammer(groupId: string, propertyId: string, effectId: string): Promise<EffectVisualizationVector[]> {
        if (!this.store.userContextId) {
            throw new Error("No user context set, cannot get effect visualization vectors from programmer");
        }
        return new Promise((resolve, reject) => {
            this.client.getEffectVisualizationVectors({
                requestId: this.store.createRequestId(),
                params: {
                    userContextId: this.store.userContextId!,
                    effectId,
                    groupId,
                    propertyId
                }
            }, this.store.getMetadata(), (err, response) => {
                if (err) {
                    return reject(err);
                }
                resolve(response.vectors);
            });
        });
    }

    public receiveAttachableChanges(): ClientReadableStream<AttachableChangeMessage> {
        if (!this.changeStream) {
            this.changeStream = this.client.receiveAttachableChanges({ requestId: this.store.createRequestId() }, this.store.getMetadata());
        }
        return this.changeStream;
    }

    public async close() {
        await gracefulStopReadableStream(this.changeStream);
        this.client.close();
    }
}