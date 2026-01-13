import { ClientDuplexStream, ClientReadableStream } from "@grpc/grpc-js";
import { CuelistClientClient } from "../../generated/Client/CuelistClient";
import { AllCuelistActionRequest_EAction, AllCuelistActionResponse, CueAddFromProgrammerRequest, CueAddFromProgrammerRequest_EAddType, CuelistActionRequest_EAction, CuelistChangedMessage, CuelistDeletionResponse, CuelistDescriptor, CuelistProgressStateChangeMessage, CuelistProgressStateChangeRequest, SetCuelistValueRequest, SpecialCueInsertRequest } from "../../generated/Common/Types/Cuelist/CuelistServiceTypes";
import { ProgrammerFilterPredicate, PropertyValueSource } from "../../generated/Common/Types/ProgrammerServiceTypes";
import { BaseClient } from "../baseClient";
import { gracefulStopDuplexStream, gracefulStopReadableStream, translateToString } from "../helpers/request";
import { ClientStore } from "../store";
import { DependencyData } from "../../generated/Common/Types/DependencyTypes";
import { DependencyError } from "../helpers/dependencyError";
import { TriggerValueData } from "../../generated/Common/Types/Cue/CueTriggerServiceTypes";


export type ProgrammerFilter = Omit<ProgrammerFilterPredicate, "userContextId">;

export class CueListClient extends BaseClient<CuelistClientClient> {
    private cueListChangeStream: ClientReadableStream<CuelistChangedMessage> | undefined;
    private cueListProgressStreams: ClientDuplexStream<CuelistProgressStateChangeRequest, CuelistProgressStateChangeMessage>[] = [];

    constructor(store: ClientStore) {
        super(store, CuelistClientClient);
    }

    /**
     * Retrieves cuelists of the currently opened project from the DMXControl kernel
     *
     * @param ids - Optional array of cuelist IDs to filter by. Defaults to an empty array (no filtering).
     * @returns {Promise<CuelistDescriptor[]>}A promise that resolves to an array of `CuelistDescriptor` objects representing the retrieved cuelists.
     * @throws {Error} If the user is not logged in.
     */
    public async getCuelists(ids: string[] = []): Promise<CuelistDescriptor[]> {
        if (!this.store.userContextId) {
            throw new Error("User context not set, cannot get cuelists");
        }
        return new Promise((resolve, reject) => {
            this.client.getCuelists({ requestId: this.store.createRequestId(), idFilter: ids, userContextId: this.store.userContextId! }, (err, response) => {
                if (err) {
                    return reject(err);
                }
                resolve(response.cuelists);
            });
        });
    }

    /**
     * Creates a new cuelist
     *
     * @param {string} name - The template name to use for the new cuelist.
     * @returns {Promise<string>} A Promise that resolves to the created cuelist's ID.
     *
     * @throws {Error} If the RPC call fails or the server reports that the cuelist could not be created.
     */
    public async createCueList(name: string): Promise<string> {
        return new Promise((resolve, reject) => {
            this.client.createCuelist({ requestId: this.store.createRequestId(), cuelistNameTemplate: name, copyFromCuelist: "" }, (err, response) => {
                if (err) {
                    return reject(err);
                }
                if (!response.ok) {
                    return reject(new Error(translateToString(response.message) || "Failed to create cuelist"));
                }
                resolve(response.id!);
            });
        });
    }

    /**
     * Creates a copy of an existing cuelist
     *
     * @param {string} id - The ID of the cuelist to copy.
     * @param {string} newName - The name template for the duplicated cuelist.
     * @returns {Promise<string>} A Promise that resolves with the ID of the newly created cuelist.
     *
     * @throws {Error} If the RPC call fails or the server reports that the cuelist could not be copied.
     */
    public async copyCueList(id: string, newName: string): Promise<string> {
        return new Promise((resolve, reject) => {
            this.client.createCuelist({ requestId: this.store.createRequestId(), cuelistNameTemplate: newName, copyFromCuelist: id }, (err, response) => {
                if (err) {
                    return reject(err);
                }
                if (!response.ok) {
                    return reject(new Error(translateToString(response.message) || "Failed to copy cuelist"));
                }
                resolve(response.id!);
            });
        });
    }

    /**
     * Deletes a cuelist from the currently opened project
     *
     * @param id - The ID of the cuelist to delete.
     * @param dependencies - Optional dependency information used to resolve linked resources before deletion.
     *
     * @returns A Promise that resolves when the cuelist has been successfully deleted.
     *
     * @throws {DependencyError} If the server reports that the cuelist cannot be deleted due to existing dependencies.
     * @throws {Error} If the RPC call fails or another unexpected error occurs.
     *
     * @remarks
     * This method will reject with a {@link DependencyError} if deletion is blocked by linked resources.
     * The `dependencies` property of the error contains detailed information about what is preventing deletion.
     */

    public async deleteCueList(id: string, dependencies?: DependencyData): Promise<void> {
        return new Promise((resolve, reject) => {
            this.client.deleteCuelist({ requestId: this.store.createRequestId(), cuelistId: id, dependencies: dependencies }, (err, response) => {
                if (err) {
                    return reject(err);
                }
                if (response.error) {
                    return reject(new DependencyError(response.error, response.dependencies));
                }
                resolve();
            });
        });
    }

    private async setCueListValue(cueListId: string, request: Partial<SetCuelistValueRequest>): Promise<string> {
        return new Promise((resolve, reject) => {
            this.client.setCuelistValue({
                requestId: this.store.createRequestId(),
                cuelistId: cueListId,
                intensity: undefined,
                fadeFactor: undefined,
                speedFactor: undefined,
                tempFader: undefined,
                ...request
            }, (err, response) => {
                if (err) {
                    return reject(err);
                }
                if (!response.ok) {
                    return reject(new Error(translateToString(response.message) || "Failed to set cuelist value"));
                }
                resolve(cueListId);
            });
        });
    }

    /**
     * Sets the intensity of a cuelist
     *
     * @param cueListId - The ID of the cuelist to update.
     * @param intensity - The new intensity value for the cuelist. Values are clamped between 0 and 1.
     * @returns A Promise that resolves with the ID of the updated cuelist.
     *
     * @throws {Error} If the RPC call fails or the server reports that the value could not be set.
     */
    public async setCueListIntensity(cueListId: string, intensity: number): Promise<string> {
        intensity = Math.max(0, Math.min(1, intensity)); // Clamp intensity between 0 and 1
        return this.setCueListValue(cueListId, { intensity });
    }

    /**
     * Sets the fade factor of a cuelist 
     * 
     * @param cueListId - The ID of the cuelist to update.
     * @param fadeFactor - The new fade factor for the cuelist.
     * @returns A Promise that resolves with the ID of the updated cuelist.
     *
     * @throws {Error} If the RPC call fails or the server reports that the value could not be set.
     */
    public async setCueListFadeFactor(cueListId: string, fadeFactor: number): Promise<string> {
        return this.setCueListValue(cueListId, { fadeFactor });
    }

    /**
     * Sets the speed factor of a cuelist
     *
     * @param cueListId - The ID of the cuelist to update.
     * @param speedFactor - The new speed factor for the cuelist.
     * @returns A Promise that resolves with the ID of the updated cuelist.
     *
     * @throws {Error} If the RPC call fails or the server reports that the value could not be set.
     */
    public async setCueListSpeedFactor(cueListId: string, speedFactor: number): Promise<string> {
        return this.setCueListValue(cueListId, { speedFactor });
    }

    /**
     * Sets the temporary fader value of a cuelist
     *
     * @param cueListId - The ID of the cuelist to update.
     * @param tempFader - The new temporary fader value for the cuelist.
     * @returns A Promise that resolves with the ID of the updated cuelist.
     *
     * @throws {Error} If the RPC call fails or the server reports that the value could not be set.
     */
    public async setCueListTempFader(cueListId: string, tempFader: number): Promise<string> {
        return this.setCueListValue(cueListId, { tempFader });
    }

    private async cueListAction(cueListId: string, action: CuelistActionRequest_EAction, index: number): Promise<string> {
        return new Promise((resolve, reject) => {
            this.client.cuelistAction({
                requestId: this.store.createRequestId(),
                cuelistId: cueListId,
                action,
                index: index
            }, (err, response) => {
                if (err) {
                    return reject(err);
                }
                if (!response.ok) {
                    return reject(new Error(translateToString(response.message) || `Failed to perform action ${CuelistActionRequest_EAction[action]} on cuelist`));
                }
                resolve(cueListId);
            });
        });
    }

    /**
     * Starts or resumes playback of a cuelist
     *
     * @param cueListId - The ID of the cuelist to start or resume.
     * @returns A Promise that resolves with the ID of the cuelist once playback has been initiated or resumed.
     *
     * @throws {Error} If the RPC call fails or the server reports that the cuelist could not be started.
     *
     * @remarks
     * If the cuelist is not running, playback begins from the first cue.  
     * If the cuelist is paused, playback will resume from the current position.
     */
    public async playCueList(cueListId: string): Promise<string> {
        return this.cueListAction(cueListId, CuelistActionRequest_EAction.PLAY, 0);
    }

    /**
     * Pauses playback of a cuelist
     *
     * @param cueListId - The ID of the cuelist to pause.
     * @returns A Promise that resolves with the ID of the cuelist once it has been paused.
     *
     * @throws {Error} If the RPC call fails or the server reports that the cuelist could not be paused.
     */
    public async pauseCueList(cueListId: string): Promise<string> {
        return this.cueListAction(cueListId, CuelistActionRequest_EAction.PAUSE, 0);
    }

    /**
     * Stops playback of a cuelist
     *
     * @param cueListId - The ID of the cuelist to stop.
     * @returns A Promise that resolves with the ID of the cuelist once it has been stopped.
     *
     * @throws {Error} If the RPC call fails or the server reports that the cuelist could not be stopped.
     */
    public async stopCueList(cueListId: string): Promise<string> {
        return this.cueListAction(cueListId, CuelistActionRequest_EAction.STOP, 0);
    }

    /**
     * Advances the cuelist to the next cue
     *
     * @param cueListId - The ID of the cuelist to advance.
     * @returns A Promise that resolves with the ID of the cuelist once the cue has been changed.
     *
     * @throws {Error} If the RPC call fails or the server reports that the cuelist could not advance.
     *
     * @remarks
     * This action steps the cuelist forward to the next cue in its sequence.
     * If the cuelist is not running, it begins playback from the first cue.
     */
    public async goCueList(cueListId: string): Promise<string> {
        return this.cueListAction(cueListId, CuelistActionRequest_EAction.GO, 0);
    }

    /**
     * Steps to the previous cue of the cuelist
     *
     * @param cueListId - The ID of the cuelist to step back.
     * @returns A Promise that resolves with the ID of the cuelist once the cue has been changed.
     *
     * @throws {Error} If the RPC call fails or the server reports that the cuelist could not step back.
     */
    public async goBackCue(cueListId: string): Promise<string> {
        return this.cueListAction(cueListId, CuelistActionRequest_EAction.GO_BACK, 0);
    }

    /**
     * Jumps the cuelist to a specific cue index
     *
     * @param cueListId - The ID of the cuelist to modify.
     * @param index - The zero-based index of the cue to jump to.
     * @returns A Promise that resolves with the ID of the cuelist once the target cue has been activated.
     *
     * @throws {Error} If the RPC call fails or the server reports that the cuelist could not jump to the specified cue.
     *
     * @remarks
     * This action immediately activates the cue at the specified index, bypassing any intermediate cues.
     */
    public async goToCue(cueListId: string, index: number): Promise<string> {
        return this.cueListAction(cueListId, CuelistActionRequest_EAction.GO_TO, index);
    }

    /**
     * Advances the cuelist to the next cue in the playback sequence
     *
     * @param cueListId - The ID of the cuelist to advance.
     * @returns A Promise that resolves with the ID of the cuelist once the next cue has been activated.
     *
     * @throws {Error} If the RPC call fails or the server reports that the cuelist could not advance to the next cue.
     *
     * @remarks
     * This action moves the cuelist forward by one cue, similar to pressing "Next" on a playback controller.
     * If the cuelist is paused or stopped, playback continues or restarts from the next cue.
     */
    public async goNextCue(cueListId: string): Promise<string> {
        return this.cueListAction(cueListId, CuelistActionRequest_EAction.GO_NEXT, 0);
    }

    /**
     * Preloads a specific cue in a cuelist without immediately starting playback.
     *
     * @param cueListId - The ID of the cuelist containing the cue to load.
     * @param index - The zero-based index of the cue to preload.
     * @returns A Promise that resolves with the ID of the cuelist once the cue has been loaded.
     *
     * @throws {Error} If the RPC call fails or the server reports that the cue could not be loaded.
     *
     * @remarks
     * Loading a cue prepares it for playback without executing any transitions or fades.
     */
    public async loadCue(cueListId: string, index: number): Promise<string> {
        return this.cueListAction(cueListId, CuelistActionRequest_EAction.LOAD, index);
    }

    /**
     * Renumbers all cues in a cuelist to maintain a consistent numbering sequence starting from 1.
     *
     * @param cueListId - The ID of the cuelist whose cues should be renumbered.
     * @returns A Promise that resolves with the ID of the cuelist once the cues have been renumbered.
     *
     * @throws {Error} If the RPC call fails or the server reports that the cues could not be renumbered.
     *
     * @remarks
     * This action reassigns scene numbers to all cues in the cuelist, typically to eliminate gaps
     * or restore a clean numbering order after cues have been added, deleted, or moved.
     */
    public async renumberCues(cueListId: string): Promise<string> {
        return this.cueListAction(cueListId, CuelistActionRequest_EAction.REASSIGN_SCENE_NUMBERS, 0);
    }

    // Even more WTF
    public async insertSpecialCue(cueListId: string, specialCueType: number, request: Partial<SpecialCueInsertRequest>): Promise<string> {
        if (!this.store.userContextId) {
            throw new Error("User context not set, cannot insert special cue");
        }
        return new Promise((resolve, reject) => {
            this.client.insertSpecialCue({
                requestId: this.store.createRequestId(),
                cuelistId: cueListId,
                userContextId: this.store.userContextId!,
                specialEnum: specialCueType,
                index: 0,
                specialValue: undefined,
                presetId: undefined,
                audio: undefined,
                otherCuelistId: undefined,
                sum: undefined,
                psum: undefined,
                macro: undefined,
                timecodeId: undefined
                , ...request
            }, (err, response) => {
                if (err) {
                    return reject(err);
                }
                console.log(response);
                if (!response.ok) {
                    return reject(new Error(translateToString(response.message) || "Failed to insert special cue"));
                }
                resolve(cueListId);
            });
        });
    }

    private async modifyProgrammerCue(cueListId: string, request: Partial<CueAddFromProgrammerRequest>): Promise<string> {
        if (!this.store.userContextId) {
            throw new Error("User context not set, cannot modify programmer cue");
        }
        return new Promise((resolve, reject) => {
            this.client.addProgrammerCue({
                requestId: this.store.createRequestId(),
                cuelistId: cueListId,
                userContextId: this.store.userContextId!,
                index: 0,
                predicate: undefined,
                type: CueAddFromProgrammerRequest_EAddType.NONE,
                triggerValue: undefined,
                ...request
            }, (err, response) => {
                if (err) {
                    return reject(err);
                }
                if (!response.ok) {
                    return reject(new Error(translateToString(response.message) || "Failed to modify programmer cue"));
                }
                resolve(cueListId);
            });
        });
    }

    private programmerPredicate(filter?: ProgrammerFilter): ProgrammerFilterPredicate | undefined {
        if (!this.store.userContextId) {
            throw new Error("User context not set, cannot modify programmer cue");
        }
        return filter ? {
            userContextId: this.store.userContextId!,
            ...filter
        } : undefined;
    }

    /**
     * Creates a new cue in the specified cuelist from the current programmer state.
     *
     * @param cueListId - The ID of the cuelist where the new cue will be added.
     * @param trigger - Optional trigger value to associate with the new cue.
     * @param filter - Optional filter to select which devices or properties to include in the new cue.
     * @returns A Promise that resolves once the new cue has been added to the cuelist.
     *
     * @throws {Error} If the RPC call fails or the server reports that the cue could not be created.
     */
    public async createCueFromProgrammer(cueListId: string, trigger?: TriggerValueData, filter?: ProgrammerFilter) {
        return this.modifyProgrammerCue(cueListId, {
            predicate: this.programmerPredicate(filter),
            triggerValue: trigger,
            type: CueAddFromProgrammerRequest_EAddType.ADD
        });
    }
    /**
     * Inserts a new cue at a specific position in the specified cuelist from the current programmer state.
     *
     * @param cueListId - The ID of the cuelist where the new cue will be inserted.
     * @param index - The zero-based position at which the cue should be inserted.
     * @param trigger - Optional trigger value to associate with the new cue.
     * @param filter - Optional filter to select which devices or properties to include in the new cue.
     * @returns A Promise that resolves once the cue has been inserted.
     *
     * @throws {Error} If the RPC call fails or the server reports that the cue could not be inserted.
     */
    public async insertCueFromProgrammer(cueListId: string, index: number, trigger?: TriggerValueData, filter?: ProgrammerFilter) {
        return this.modifyProgrammerCue(cueListId, {
            predicate: this.programmerPredicate(filter),
            triggerValue: trigger,
            type: CueAddFromProgrammerRequest_EAddType.INSERT,
            index
        });
    }

    /**
     * Replaces an existing cue at a specific position in the specified cuelist with the current programmer state.
     *
     * @param cueListId - The ID of the cuelist containing the cue to replace.
     * @param index - The zero-based position of the cue to replace.
     * @param filter - Optional filter to select which devices or properties to include in the new cue.
     * @returns A Promise that resolves once the cue has been replaced.
     *
     * @throws {Error} If the RPC call fails or the server reports that the cue could not be replaced.
     */
    public async replaceCueWithProgrammer(cueListId: string, index: number, filter?: ProgrammerFilter) {
        return this.modifyProgrammerCue(cueListId, {
            predicate: this.programmerPredicate(filter),
            type: CueAddFromProgrammerRequest_EAddType.REPLACE,
            index
        });
    }

    /**
     * Merges the current programmer state into an existing cue at a specific position in the specified cuelist.
     *
     * @param cueListId - The ID of the cuelist containing the cue to merge into.
     * @param index - The zero-based position of the cue to merge with.
     * @param filter - Optional filter to select which devices or properties are included in the merge.
     * @returns A Promise that resolves once the cue has been updated with the merged values.
     *
     * @throws {Error} If the RPC call fails or the server reports that the cue could not be updated.
     */
    public async mergeProgrammerIntoCue(cueListId: string, index: number, filter?: ProgrammerFilter) {
        return this.modifyProgrammerCue(cueListId, {
            predicate: this.programmerPredicate(filter),
            type: CueAddFromProgrammerRequest_EAddType.MERGE,
            index
        });
    }

    /**
     * Appends values from the current programmer state to an existing cue at a specific position in the specified cuelist.
     *
     * @param cueListId - The ID of the cuelist containing the cue to append to.
     * @param index - The zero-based position of the cue to append values to.
     * @param filter - Optional filter to select which devices or properties are included in the append.
     * @returns A Promise that resolves once the cue has been updated with the appended values.
     *
     * @throws {Error} If the RPC call fails or the server reports that the cue could not be updated.
     */
    public async appendProgrammerToCue(cueListId: string, index: number, filter?: ProgrammerFilter) {
        return this.modifyProgrammerCue(cueListId, {
            predicate: this.programmerPredicate(filter),
            type: CueAddFromProgrammerRequest_EAddType.APPEND,
            index
        });
    }

    /**
     * Subtracts values from the current programmer state from an existing cue at a specific position in the specified cuelist.
     *
     * @param cueListId - The ID of the cuelist containing the cue to modify.
     * @param index - The zero-based position of the cue to subtract values from.
     * @param filter - Optional filter to select which devices or properties are affected by the subtraction.
     * @returns A Promise that resolves once the cue has been updated with the subtracted values.
     *
     * @throws {Error} If the RPC call fails or the server reports that the cue could not be updated.
     */
    public async subtractProgrammerFromCue(cueListId: string, index: number, filter?: ProgrammerFilter) {
        return this.modifyProgrammerCue(cueListId, {
            predicate: this.programmerPredicate(filter),
            type: CueAddFromProgrammerRequest_EAddType.SUBTRACT,
            index
        });
    }


    public async getPropertyValueSources(cueListId: string, index: number): Promise<PropertyValueSource[]> {
        if (!this.store.userContextId) {
            throw new Error("User context not set, cannot get property value sources");
        }
        return new Promise((resolve, reject) => {
            this.client.getPropertyValueSources({
                requestId: this.store.createRequestId(),
                cuelistId: cueListId,
                userContextId: this.store.userContextId!,
                index,
            }, (err, response) => {
                if (err) {
                    return reject(err);
                }
                if (response.notFound) {
                    return reject(new Error("Cuelist or cue not found"));
                }
                resolve(response.sources);
            });
        });
    }

    public async getCuelistProgress(): Promise<CuelistProgressStateChangeMessage | undefined> {
        return new Promise((resolve, reject) => {
            this.client.getCuelistProgress({ requestId: this.store.createRequestId() }, (err, response) => {
                if (err) {
                    return reject(err);
                }
                if (response.notFound) {
                    return reject(new Error("No cuelist is currently running"));
                }
                resolve(response.message);
            });
        });
    }

    public receiveCuelistChanges(): ClientReadableStream<CuelistChangedMessage> {
        if (!this.cueListChangeStream) {
            this.cueListChangeStream = this.client.receiveCuelistChanges({ requestId: this.store.createRequestId() });
        }
        return this.cueListChangeStream;
    }

    public receiveCuelistProgress(cuelistIds: string[] = []): ClientDuplexStream<CuelistProgressStateChangeRequest, CuelistProgressStateChangeMessage> {
        const stream = this.client.receiveCuelistProgressChanges();
        stream.write({ cuelistIds });
        this.cueListProgressStreams.push(stream);
        return stream;
    }

    private async allCueListActions(action: AllCuelistActionRequest_EAction): Promise<AllCuelistActionResponse> {
        return new Promise((resolve, reject) => {
            this.client.allCuelistAction({
                requestId: this.store.createRequestId(),
                action
            }, (err, response) => {
                if (err) {
                    return reject(err);
                }
                resolve(response);
            });
        });
    }

    /**
     * Stops playback of all cuelists.
     *
     * @returns A Promise that resolves with a response detailing the result of stopping all cuelists.
     *
     * @throws {Error} If the RPC call fails or the server reports that some or all cuelists could not be stopped.
     */
    public async stopAllCuelists(): Promise<AllCuelistActionResponse> {
        return this.allCueListActions(AllCuelistActionRequest_EAction.STOP);
    }

    public async close(): Promise<void> {
        await Promise.all([
            gracefulStopReadableStream(this.cueListChangeStream),
            ...this.cueListProgressStreams.map(stream => gracefulStopDuplexStream(stream))]);
        await super.close();
    }
}