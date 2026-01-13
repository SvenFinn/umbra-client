import { ClientReadableStream } from "@grpc/grpc-js";
import { MacroBoardClientClient } from "../../generated/Client/MacroBoardClient";
import { EChangeType } from "../../generated/Common/Types/CommonTypes";
import { MacroBoardButtonPressed, MacroBoardDescriptor, MacroBoardProfileDescriptor } from "../../generated/Common/Types/Input/MacroBoard/MacroBoardServiceTypes";
import { BaseClient } from "../baseClient";
import { gracefulStopReadableStream, translateToString } from "../helpers/request";
import { ClientStore } from "../store";
import { MacroBoardChangedMessage, MacroBoardProfileChangedMessage } from "../../generated/Common/Types/Input/MacroBoard/MacroBoardServiceCRUDTypes";

export class MacroBoardClient extends BaseClient<MacroBoardClientClient> {
    private proxies: Set<string> = new Set<string>();
    private boardChangeStream: ClientReadableStream<MacroBoardChangedMessage> | undefined;
    private profileChangeStream: ClientReadableStream<MacroBoardProfileChangedMessage> | undefined;

    constructor(store: ClientStore) {
        super(store, MacroBoardClientClient);
    }

    public async getMacroBoards(ids: string[] = []): Promise<MacroBoardDescriptor[]> {
        if (!this.store.userContextId) {
            throw new Error("No user context set, cannot get macro boards");
        }
        return new Promise((resolve, reject) => {
            this.client.getMacroBoards({ idFilter: ids, requestId: this.store.createRequestId(), userContextId: this.store.userContextId! }, (err, response) => {
                if (err) {
                    return reject(err);
                }
                resolve(response.macroBoards);
            });
        });
    }

    public async getMacroBoard(id: string): Promise<MacroBoardDescriptor | undefined> {
        const boards = await this.getMacroBoards();
        return boards.find(b => b.id === id);
    }

    public async getMacroBoardProfiles(ids: string[] = []): Promise<MacroBoardProfileDescriptor[]> {
        if (!this.store.userContextId) {
            throw new Error("No user context set, cannot get macro board profiles");
        }
        return new Promise((resolve, reject) => {
            this.client.getMacroBoardProfiles({ idFilter: ids, requestId: this.store.createRequestId(), userContextId: this.store.userContextId! }, (err, response) => {
                if (err) {
                    return reject(err);
                }
                resolve(response.profiles);
            });
        });
    }

    public async getMacroBoardProfileTemplates(ids: string[] = []): Promise<MacroBoardProfileDescriptor[]> {
        if (!this.store.userContextId) {
            throw new Error("No user context set, cannot get macro board profile templates");
        }
        return new Promise((resolve, reject) => {
            this.client.getMacroBoardProfileTemplates({ idFilter: ids, requestId: this.store.createRequestId(), userContextId: this.store.userContextId! }, (err, response) => {
                if (err) {
                    return reject(err);
                }
                resolve(response.profiles);
            });
        });
    }

    public async createMacroBoardProfile(name: string, width: number, height: number): Promise<string> {
        return new Promise((resolve, reject) => {
            this.client.createMacroBoardProfile({
                requestId: this.store.createRequestId(),
                profileNameTemplate: name,
                customProfileSize: {
                    width,
                    height
                }
            }, (err, response) => {
                if (err) {
                    return reject(err);
                }
                if (!response.ok) {
                    return reject(new Error(translateToString(response.message) || "Failed to create macro board profile"));
                }
                resolve(response.id)
            });
        });
    }

    public async createMacroBoardProfileFromBoard(name: string, macroBoardId: string): Promise<string> {
        const board = await this.getMacroBoard(macroBoardId);
        if (!board) {
            throw new Error(`Macro board with ID ${macroBoardId} not found`);
        }
        return new Promise((resolve, reject) => {
            this.client.createMacroBoardProfile({
                requestId: this.store.createRequestId(),
                profileNameTemplate: name,
                macroBoard: board
            }, (err, response) => {
                if (err) {
                    return reject(err);
                }
                if (!response.ok) {
                    return reject(new Error(translateToString(response.message) || "Failed to create macro board profile from board"));
                }
                resolve(response.id)
            });
        });
    }

    public async createMacroBoardProfileFromTemplate(name: string, templateId: string): Promise<string> {
        return new Promise((resolve, reject) => {
            this.client.createMacroBoardProfile({
                requestId: this.store.createRequestId(),
                profileNameTemplate: name,
                copyFromTemplate: templateId
            }, (err, response) => {
                if (err) {
                    return reject(err);
                }
                if (!response.ok) {
                    return reject(new Error(translateToString(response.message) || "Failed to create macro board profile from template"));
                }
                resolve(response.id)
            });
        });
    }

    public async createMacroBoardProfileFromProfile(name: string, profileId: string): Promise<string> {
        return new Promise((resolve, reject) => {
            this.client.createMacroBoardProfile({
                requestId: this.store.createRequestId(),
                profileNameTemplate: name,
                copyFromProfile: profileId
            }, (err, response) => {
                if (err) {
                    return reject(err);
                }
                if (!response.ok) {
                    return reject(new Error(translateToString(response.message) || "Failed to create macro board profile from profile"));
                }
                resolve(response.id)
            });
        });
    }

    public async deleteMacroBoardProfile(id: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.client.deleteMacroBoardProfile({
                requestId: this.store.createRequestId(),
                profileId: id
            }, (err, response) => {
                if (err) {
                    return reject(err);
                }
                if (!response.deleted) {
                    return reject("Failed to delete macro board profile");
                }
                resolve();
            });
        });
    }

    public async renameMacroBoardProfile(id: string, newName: string,): Promise<void> {
        return new Promise((resolve, reject) => {
            this.client.changeMacroBoardProfile({
                requestId: this.store.createRequestId(),
                profileId: id,
                name: newName,
                buttonPressed: [], // Should potentially read the current state?
            }, (err, response) => {
                if (err) {
                    return reject(err);
                }
                if (!response.ok) {
                    return reject(new Error(translateToString(response.message) || "Failed to rename macro board profile"));
                }
                resolve();
            });
        });
    }

    public async renumberMacroBoardProfile(id: string, newNumber: number): Promise<void> {
        return new Promise((resolve, reject) => {
            this.client.changeMacroBoardProfile({
                requestId: this.store.createRequestId(),
                profileId: id,
                number: newNumber,
                buttonPressed: [], // Should potentially read the current state?
            }, (err, response) => {
                if (err) {
                    return reject(err);
                }
                if (!response.ok) {
                    return reject(new Error(translateToString(response.message) || "Failed to renumber macro board profile"));
                }
                resolve();
            });
        });
    }


    public async updateMacroBoardProfileButtons(profileId: string, buttons: MacroBoardButtonPressed[]): Promise<void> {
        return new Promise((resolve, reject) => {
            this.client.changeMacroBoardProfile({
                requestId: this.store.createRequestId(),
                profileId: profileId,
                buttonPressed: buttons,
            }, (err, response) => {
                if (err) {
                    return reject(err);
                }
                if (!response.ok) {
                    return reject(new Error(translateToString(response.message) || "Failed to set macro board profile buttons"));
                }
                resolve();
            });
        });
    }

    public async createMacroBoardProxy(name: string, width: number, height: number): Promise<string> {
        if (!this.store.userContextId) {
            throw new Error("No user context set, cannot create macro board proxy");
        }
        return new Promise((resolve, reject) => {
            this.client.createOrUpdateOrDeleteMacroBoardProxy({
                requestId: this.store.createRequestId(),
                userContextId: this.store.userContextId!,
                runtimeId: this.store.runtimeId!,
                changeType: EChangeType.Added,
                macroBoardId: name,
                macroBoard: {
                    id: name,
                    width: width,
                    height: height,
                },
                buttonPressed: [{
                    x: 0,
                    y: 0,
                    pressed: false
                }]
            }, (err, response) => {
                if (err) {
                    return reject(err);
                }
                if (!response.ok) {
                    return reject(new Error(translateToString(response.message) || "Failed to create macro board proxy"));
                }
                this.proxies.add(name);
                resolve(response.id);
            });
        });
    }

    public async updateMacroBoardProxyButtons(macroBoardId: string, buttons: MacroBoardButtonPressed[]): Promise<void> {
        if (!this.store.userContextId) {
            throw new Error("No user context set, cannot update macro board proxy buttons");
        }
        return new Promise((resolve, reject) => {
            this.client.createOrUpdateOrDeleteMacroBoardProxy({
                requestId: this.store.createRequestId(),
                userContextId: this.store.userContextId!,
                runtimeId: this.store.runtimeId!,
                changeType: EChangeType.Changed,
                macroBoardId: macroBoardId,
                buttonPressed: buttons,
                macroBoard: undefined,
            }, (err, response) => {
                if (err) {
                    return reject(err);
                }
                if (!response.ok) {
                    return reject(new Error(translateToString(response.message) || "Failed to update macro board proxy buttons"));
                }
                resolve();
            });
        });
    }

    public async deleteMacroBoardProxy(macroBoardId: string): Promise<void> {
        if (!this.store.userContextId) {
            throw new Error("No user context set, cannot delete macro board proxy");
        }
        return new Promise((resolve, reject) => {
            this.client.createOrUpdateOrDeleteMacroBoardProxy({
                requestId: this.store.createRequestId(),
                userContextId: this.store.userContextId!,
                runtimeId: this.store.runtimeId!,
                changeType: EChangeType.Removed,
                macroBoardId: macroBoardId,
                buttonPressed: [],
                macroBoard: undefined,
            }, (err, response) => {
                if (err) {
                    return reject(err);
                }
                if (!response.ok) {
                    return reject(new Error(translateToString(response.message) || "Failed to delete macro board proxy"));
                }
                this.proxies.delete(macroBoardId);
                resolve();
            });
        });
    }

    public receiveMacroBoardChanges(id: string): ClientReadableStream<MacroBoardChangedMessage> {
        if (!this.boardChangeStream) {
            this.boardChangeStream = this.client.receiveMacroBoardChanges({ requestId: id });
        }
        return this.boardChangeStream;
    }

    public receiveMacroBoardProfileChanges(id: string): ClientReadableStream<MacroBoardProfileChangedMessage> {
        if (!this.profileChangeStream) {
            this.profileChangeStream = this.client.receiveMacroBoardProfileChanges({ requestId: id });
        }
        return this.profileChangeStream;
    }

    public async close() {
        await Promise.all([
            gracefulStopReadableStream(this.profileChangeStream),
            gracefulStopReadableStream(this.boardChangeStream),
            ...Array.from(this.proxies).map(proxyId => this.deleteMacroBoardProxy(proxyId))
        ]);
        await super.close();
    }
}